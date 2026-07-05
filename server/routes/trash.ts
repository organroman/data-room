import { Router } from "express";
import { asyncHandler } from "../lib/handler";
import { validateQuery } from "../lib/validate";
import { trashQuerySchema } from "@shared/validation";
import * as controller from "../controllers/trash.controller";

export const trashRouter = Router();

trashRouter.get("/", validateQuery(trashQuerySchema), asyncHandler(controller.listTrash));
trashRouter.post("/:type/:id/restore", asyncHandler(controller.restoreTrashEntry));
trashRouter.post("/empty", validateQuery(trashQuerySchema), asyncHandler(controller.emptyTrash));
