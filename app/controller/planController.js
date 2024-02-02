import { getValue, postValue } from "../service/planService.js";
import client from "../utils/redisdb.js";

//controller method to get value based on key
export const getPlanValues = async (request, response) => {
  try {
    const keyToSearch = request.params.id;
    console.log("key to search " + keyToSearch);
    const valueFound = await getValue(keyToSearch);
    console.log("value in controller " + valueFound);

    if (valueFound) {
      response.status(200);
      response.send(JSON.parse(JSON.stringify(valueFound)));
    }

    if (valueFound == null) throw new Error(err);
  } catch (err) {
    console.log("inside catch");
    console.log(err);
    response.status(404);
    response.send({ errorMessage: "key not found" });
  }
};

export const postPlanValues = async (request, response) => {
  try {
    const planFromUser = request.body;
    console.log("plan " + planFromUser);

    const planPosted = await postValue(JSON.stringify(planFromUser));

    if (planPosted) {
      const planCreation = await client.set(
        "employee1",
        JSON.stringify(planFromUser)
      );
      response.status(200);
      response.send(JSON.parse(JSON.stringify(planPosted)));
    }

    // if (planPosted == null) throw new Error(err);
  } catch (err) {
    console.log("inside catch post");
    console.log(err);
    response.status(400);
    response.send({ errorMessage: "plaan cannot be added to key-value store" });
  }
};
