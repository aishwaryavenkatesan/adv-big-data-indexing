import client from "../utils/redisdb.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";

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

  let input = JSON.parse(newPlan);

  const isValid = ajv.validate(schema, input);
  console.log(isValid);

  if (isValid) {
    const planCreation = client.json.set(objectId, "$", input);
  }
  return isValid;
};

export const deleteValue = async (key) => {
  const deleteStatus = await client.json.del(key, "$");
  return deleteStatus;
};

export const getAllValues = async () => {
  const allKeys = await client.keys("*");
  console.log("all keys " + allKeys);
  // const valueForEachKey = allKeys.map(async (key) => {
  //   const valueFromDb = JSON.stringify(await client.json.get(key));
  //   console.log("key in array " + key);
  //   console.log(" value " + JSON.stringify(await client.json.get(key)));
  //   return valueFromDb;
  // });
  // console.log("all keys " + allKeys);
  // console.log(JSON.stringify(allKeys));
  // return valuesForEachKey;
  return allKeys;
};
