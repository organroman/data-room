import { Router } from "express";
import { asyncHandler } from "../lib/handler";
import { validateBody, validateQuery } from "../lib/validate";
import { createDataroomSchema, renameSchema, contentsQuerySchema } from "../lib/validation";
import * as controller from "../controllers/datarooms.controller";

export const dataroomsRouter = Router();

dataroomsRouter.get("/", asyncHandler(controller.listDatarooms));
dataroomsRouter.post("/", validateBody(createDataroomSchema), asyncHandler(controller.createDataroom));
dataroomsRouter.patch("/:id", validateBody(renameSchema), asyncHandler(controller.renameDataroom));
dataroomsRouter.delete("/:id", asyncHandler(controller.deleteDataroom));
dataroomsRouter.post("/:id/restore", asyncHandler(controller.restoreDataroom));
dataroomsRouter.get(
  "/:id/contents",
  validateQuery(contentsQuerySchema),
  asyncHandler(controller.getDataroomContents),
);
