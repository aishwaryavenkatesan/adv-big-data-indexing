import client from "../utils/redisdb.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import etag from "etag";

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
      }
      storeInRedis(data[key]); // Recursively call for nested objects
    }
  }
}

//get value based on key
export const getValue = async (key) => {
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
    storeInRedis(input);
    console.log("after redis");
    const planCreation = client.json.set(objectId, "$", input);
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
      }
      deleteInRedis(data[key]); // Recursively call for nested objects
    }
  }
}

export const deleteValue = async (key) => {
  const keyValue = await client.json.get(key);
  deleteInRedis(keyValue);
  const deleteStatus = await client.json.del(key, "$");
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
    const plan = await client.json.get(key);
    if (!plan) {
      console.log("plan not available");
      return plan;
    } else {
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
          const planCreation = await client.json.set(key, "$", mergedData);
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
