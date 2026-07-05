import { Router } from "express";
import { asyncHandler } from "../lib/handler.js";
import { validateBody } from "../lib/validate.js";
import { starEntitySchema } from "@shared/validation";
import * as controller from "../controllers/starred.controller.js";

export const starredRouter = Router();

starredRouter.get("/", asyncHandler(controller.listStarred));
starredRouter.post("/", validateBody(starEntitySchema), asyncHandler(controller.starEntity));
starredRouter.delete("/:type/:id", asyncHandler(controller.unstarEntity));
