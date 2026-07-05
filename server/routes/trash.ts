import { Router } from "express";
import { asyncHandler } from "../lib/handler.js";
import { validateQuery } from "../lib/validate.js";
import { trashQuerySchema } from "../../shared/validation.js";
import * as controller from "../controllers/trash.controller.js";

export const trashRouter = Router();

trashRouter.get("/", validateQuery(trashQuerySchema), asyncHandler(controller.listTrash));
trashRouter.post("/:type/:id/restore", asyncHandler(controller.restoreTrashEntry));
trashRouter.post("/empty", validateQuery(trashQuerySchema), asyncHandler(controller.emptyTrash));
