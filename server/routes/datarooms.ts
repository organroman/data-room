import { Router } from "express";
import { asyncHandler } from "../lib/handler.js";
import { validateBody, validateQuery } from "../lib/validate.js";
import { nameSchema, contentsQuerySchema } from "../../shared/validation.js";
import * as controller from "../controllers/datarooms.controller.js";

export const dataroomsRouter = Router();

dataroomsRouter.get("/", asyncHandler(controller.listDatarooms));
dataroomsRouter.post("/", validateBody(nameSchema), asyncHandler(controller.createDataroom));
dataroomsRouter.patch("/:id", validateBody(nameSchema), asyncHandler(controller.renameDataroom));
dataroomsRouter.delete("/:id", asyncHandler(controller.deleteDataroom));
dataroomsRouter.post("/:id/restore", asyncHandler(controller.restoreDataroom));
dataroomsRouter.get(
  "/:id/contents",
  validateQuery(contentsQuerySchema),
  asyncHandler(controller.getDataroomContents),
);
