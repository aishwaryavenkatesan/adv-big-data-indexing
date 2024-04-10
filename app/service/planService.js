import client from "../utils/redisdb.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import etag from "etag";
import elasticsearchClient from "../utils/elasticsearchHelper.js";
import channel from "../utils/rabbitmqHelper.js";

//consume from queue
const queue = "insuracePlan";
await channel.assertQueue(queue, { durable: false });

let masterIndexValue;
async function dataToIndex(indexValue, documentValue) {
  // console.log("index value in dataToIndex function", indexValue);
  let indexInElasticsearch = await elasticsearchClient.index({
    index: masterIndexValue,
    id: indexValue,
    document: documentValue,
  });
  // console.log("client reply ", indexInElasticsearch);
}

async function deleteIndex(indexValue) {
  console.log("inside delete index");
  let deletedIndex = await elasticsearchClient.delete({
    index: masterIndexValue,
    id: indexValue,
  });
}
//to store multiple keys
function storeInRedis(data) {
  for (let key in data) {
    // console.log("data[key] " + data[key]);
    if (typeof data[key] === "object") {
      if (data[key].hasOwnProperty("objectId")) {
        client.json.set(
          `${data[key].objectType}:${data[key].objectId}`,
          "$",
          data[key],
          (err, reply) => {
            if (err) console.error(err);
            console.log(
              `Stored object with objectId ${data[key].objectId} in Redis`
            );
          }
        );
        // console.log("adding data to elasticsearch");
        let indexValue = `${data[key].objectType}:${data[key].objectId}`;
        let documentValue = data[key];
        // console.log("index value ", indexValue);
        dataToIndex(indexValue, documentValue);

        // let indexInElasticsearch = elasticsearchClient.index({
        //   index: "insurance-index",
        //   id: indexValue,
        //   document: data[key],
        // });
      }
      storeInRedis(data[key]); // Recursively call for nested objects
    }
  }
}

//get value based on key
export const getValue = async (key) => {
  let keyToGet;
  await channel.consume(
    queue,
    (msg) => {
      console.log("message from queue ", JSON.parse(msg.content.toString()));
      // keyToGet = JSON.parse(msg.content.toString());
      // console.log("key ", keyToGet);
    },
    { noAck: true }
  );
  const keyValue = await client.json.get(key);
  console.log("key value in service " + JSON.stringify(keyValue));
  return keyValue;
};

//post data based on validation with schema
export const postValue = async (newPlan, objectId) => {
  const ajv = new Ajv();
  ajv.addFormat("custom-date", function checkDateFieldFormat(deadlineDate) {
    const deadlineRegex = /\d{1,2}\-\d{1,2}\-\d{4}/;
    return deadlineRegex.test(deadlineDate);
  });
  // let rawSchemaData = readFileSync("schemaForPlan.json");
  let rawSchemaData = readFileSync("schemaForPlan.json");
  let schema = JSON.parse(rawSchemaData);
  let input = newPlan;

  const isValid = ajv.validate(schema, input);
  console.log(isValid);

  if (isValid) {
    console.log("inside is valid check");
    masterIndexValue = objectId;
    console.log("master index value ", masterIndexValue);
    await channel.consume(
      queue,
      (msg) => {
        console.log("message from queue ", JSON.parse(msg.content.toString()));
      },
      { noAck: true }
    );
    console.log("input from user ", input);
    storeInRedis(input);
    console.log("after redis");
    const planCreation = client.json.set(objectId, "$", input);
    const dataInElasticsearch = await elasticsearchClient.index({
      index: objectId,
      id: objectId,
      document: input,
    });
  }
  return isValid;
};

function deleteInRedis(data) {
  for (let key in data) {
    if (typeof data[key] === "object") {
      if (data[key].hasOwnProperty("objectId")) {
        client.json.del(
          `${data[key].objectType}:${data[key].objectId}`,
          "$",
          (err, reply) => {
            if (err) console.error(err);
            console.log(
              `Stored object with objectId ${data[key].objectId} in Redis`
            );
          }
        );
        // let indexValueToDelete = `${data[key].objectType}:${data[key].objectId}`;
        // deleteIndex(indexValueToDelete);
      }
      deleteInRedis(data[key]); // Recursively call for nested objects
    }
  }
}

export const deleteValue = async (key) => {
  await channel.consume(
    queue,
    (msg) => {
      console.log("message from queue ", JSON.parse(msg.content.toString()));
    },
    { noAck: true }
  );
  const keyValue = await client.json.get(key);
  deleteInRedis(keyValue);
  const deleteStatus = await client.json.del(key, "$");
  // let deletedIndex = await elasticsearchClient.delete({
  //   index: masterIndexValue,
  //   id: key,
  // });
  // let deletedMasterIndex = await elasticsearchClient.delete({
  //   index: masterIndexValue,
  // });
  await elasticsearchClient.indices.delete({ index: masterIndexValue });
  return deleteStatus;
};

export const getAllValues = async () => {
  const allKeys = await client.keys("*");
  console.log("all keys " + allKeys);
  return allKeys;
};

function mergeData(existingData, newData) {
  // Merge planCostShares
  existingData.planCostShares = newData.planCostShares;

  // Merge linkedPlanServices
  if (newData.linkedPlanServices && newData.linkedPlanServices.length > 0) {
    newData.linkedPlanServices.forEach((newService) => {
      const existingServiceIndex = existingData.linkedPlanServices.findIndex(
        (existingService) => existingService.objectId === newService.objectId
      );
      if (existingServiceIndex !== -1) {
        // If service with the same objectId exists, overwrite it
        existingData.linkedPlanServices[existingServiceIndex] = newService;
      } else {
        // If service with the same objectId doesn't exist, add it
        existingData.linkedPlanServices.push(newService);
      }
    });
  }

  return existingData;
}

export const updateNewPlan = async (request, key) => {
  try {
    await channel.consume(
      queue,
      (msg) => {
        console.log("message from queue ", JSON.parse(msg.content.toString()));
      },
      { noAck: true }
    );
    const plan = await client.json.get(key);
    if (!plan) {
      console.log("plan not available");
      return plan;
    } else {
      //to check if request body is valid for the given schema
      const ajv = new Ajv();
      ajv.addFormat("custom-date", function checkDateFieldFormat(deadlineDate) {
        const deadlineRegex = /\d{1,2}\-\d{1,2}\-\d{4}/;
        return deadlineRegex.test(deadlineDate);
      });

      let rawSchemaData = readFileSync("schemaForPlan.json");
      let schema = JSON.parse(rawSchemaData);
      let input = request.body;

      const isValid = ajv.validate(schema, input);
      console.log(isValid);
      console.log("after validation check");

      if (isValid) {
        const etagFromClient = request.get("if-match");
        const etagFromServer = etag(JSON.stringify(plan));
        console.log("Post Etag", etagFromClient);
        console.log("Patch Etag", etagFromServer);

        if (etagFromClient === etagFromServer) {
          const newData = request.body;
          const mergedData = mergeData(plan, newData);
          masterIndexValue = key;
          const planCreation = await client.json.set(key, "$", mergedData);
          const dataInElasticsearch = await elasticsearchClient.index({
            index: key,
            id: key,
            document: mergedData,
          });
          console.log("Plan Creation:", planCreation);
          console.log("inside is valid check");
          const putValue = await client.json.get(key);
          storeInRedis(putValue);
          console.log("after redis");
          return putValue; //"available"
        } else {
          return "not available";
        }
      } else {
        console.log("inside else for schema validation part");
        return isValid;
      }
    }
  } catch (err) {
    console.log("error in patch ", err);
  }
};
