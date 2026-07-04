import { Router } from "express";
import { asyncHandler } from "../lib/handler";
import { validateBody } from "../lib/validate";
import { createFolderSchema, renameSchema } from "../lib/validation";
import * as controller from "../controllers/folders.controller";

export const foldersRouter = Router();

foldersRouter.post("/", validateBody(createFolderSchema), asyncHandler(controller.createFolder));
foldersRouter.patch("/:id", validateBody(renameSchema), asyncHandler(controller.renameFolder));
foldersRouter.delete("/:id", asyncHandler(controller.deleteFolder));
foldersRouter.post("/:id/restore", asyncHandler(controller.restoreFolder));
