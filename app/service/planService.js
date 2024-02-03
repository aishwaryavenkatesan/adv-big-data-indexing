import client from "../utils/redisdb.js";
import Ajv from "ajv";
import { readFileSync } from "fs";

//get value based on key
export const getValue = async (key) => {
  const keyValue = await client.json.get(key);
  console.log("key value in service " + JSON.stringify(keyValue));
  return keyValue;
};

//post data based on validation with schema
export const postValue = async (newPlan) => {
  const ajv = new Ajv();
  let rawSchemaData = readFileSync("schemaForPlan.json");
  let schema = JSON.parse(rawSchemaData);

  let input = JSON.parse(newPlan);

  const isValid = ajv.validate(schema, input);
  console.log(isValid);

  if (isValid) {
    const planCreation = client.json.set("plan-object-2", "$", input);
  }
  return isValid;
};
