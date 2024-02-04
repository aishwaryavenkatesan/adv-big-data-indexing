import express from "express";

import * as controller from "../controller/planController.js";

const router = express.Router();

router
  .route("/:id")
  .get(controller.getPlanValues)
  .delete(controller.removePlanValues);

router.route("/").post(controller.postPlanValues);

export default router;
