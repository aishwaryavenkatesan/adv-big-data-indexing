import express from "express";
import * as controller from "../controller/planController.js";
import { OAuth2Client, auth } from "google-auth-library";

const router = express.Router();
const CLIENT_ID =
  "751276134834-uun7arji3kdbuobpb6qv12thb7chsrjq.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log("auth header " + authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  // console.log("token " + token);
  if (token == null || token === undefined)
    return res.status(401).send({ message: "Invalid or missing token" });

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userid = payload["sub"];
    req.user = payload; // Set user information in request object
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).send({ message: "cannot verify token" }); // Forbidden
  }
});
// const authenticateToken = async (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   const token = authHeader && authHeader.split(" ")[1];
//   if (token == null)
//     return res.sendStatus(401).send({ message: "Invalid or missing token" });

//   try {
//     const ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: CLIENT_ID,
//     });
//     const payload = ticket.getPayload();
//     const userid = payload["sub"];
//     req.user = payload; // Set user information in request object
//     next();
//   } catch (error) {
//     console.error("Token verification failed:", error);
//     return res.sendStatus(403); // Forbidden
//   }
// };

router
  .route("/:id")
  .get(controller.getPlanValues)
  .delete(controller.removePlanValues)
  .patch(controller.updateValues);

router.route("/").post(controller.postPlanValues).get(controller.getAll);

export default router;
