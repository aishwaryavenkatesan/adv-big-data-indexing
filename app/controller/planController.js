import { getValue } from "../service/planService.js";

//controller method to get value based on key
export const getPlanValues = async (request, response) => {
  try {
    const keyToSearch = request.params.id;
    console.log("key to search " + keyToSearch);
    const valueFound = await getValue(keyToSearch);

    if (valueFound) {
      response.status(200);
      response.send(valueFound);
    }
  } catch (err) {
    console.log("inside catch");
    response.status(400);
    response.send({ errorMessage: err });
  }
};
