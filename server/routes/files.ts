import { Router } from "express";
import { asyncHandler } from "../lib/handler.js";
import { validateBody } from "../lib/validate.js";
import { nameSchema, confirmUploadSchema } from "../../shared/validation.js";
import * as controller from "../controllers/files.controller.js";

export const filesRouter = Router();

// Body here comes from @vercel/blob's client `upload()` helper, not our own schema.
filesRouter.post("/upload-url", asyncHandler(controller.getUploadUrl));
filesRouter.post("/confirm", validateBody(confirmUploadSchema), asyncHandler(controller.confirmUpload));
filesRouter.patch("/:id", validateBody(nameSchema), asyncHandler(controller.renameFile));
filesRouter.delete("/:id", asyncHandler(controller.deleteFile));
filesRouter.post("/:id/restore", asyncHandler(controller.restoreFile));
filesRouter.get("/:id", asyncHandler(controller.getFile));
