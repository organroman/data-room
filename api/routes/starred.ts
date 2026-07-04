import { Router } from "express";
import { asyncHandler } from "../lib/handler";
import { validateBody } from "../lib/validate";
import { starEntitySchema } from "../lib/validation";
import * as controller from "../controllers/starred.controller";

export const starredRouter = Router();

starredRouter.get("/", asyncHandler(controller.listStarred));
starredRouter.post("/", validateBody(starEntitySchema), asyncHandler(controller.starEntity));
starredRouter.delete("/:type/:id", asyncHandler(controller.unstarEntity));
