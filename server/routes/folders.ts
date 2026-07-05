import { Router } from "express";
import { asyncHandler } from "../lib/handler.js";
import { validateBody } from "../lib/validate.js";
import { createFolderSchema, nameSchema } from "@shared/validation";
import * as controller from "../controllers/folders.controller.js";

export const foldersRouter = Router();

foldersRouter.post("/", validateBody(createFolderSchema), asyncHandler(controller.createFolder));
foldersRouter.patch("/:id", validateBody(nameSchema), asyncHandler(controller.renameFolder));
foldersRouter.delete("/:id", asyncHandler(controller.deleteFolder));
foldersRouter.post("/:id/restore", asyncHandler(controller.restoreFolder));
