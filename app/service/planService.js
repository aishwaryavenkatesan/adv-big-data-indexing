import client from "../utils/redisdb.js";

//get value based on key
export const getValue = async (key) => {
  const keyValue = client.get(key);
  return keyValue;
};
