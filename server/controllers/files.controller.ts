import type { Request, Response } from "express";
import type { HandleUploadBody } from "@vercel/blob/client";
import { generateUploadToken } from "../lib/blob";
import * as filesService from "../services/files.service";
import type { ConfirmUploadInput } from "@shared/types";
import type { NameInput } from "@shared/validation";

export async function getUploadUrl(req: Request, res: Response) {
  // Body shape here is dictated by @vercel/blob's client `upload()` helper, not our
  // own schema, so it isn't zod-validated like the rest of the API's request bodies.
  const body = req.body as HandleUploadBody;
  const result = await generateUploadToken(body, req);
  res.json(result);
}

export async function confirmUpload(req: Request, res: Response) {
  const input = req.body as ConfirmUploadInput;
  const { file, renamed } = await filesService.confirmFileUpload(input);
  res.status(201).json({ file, renamed });
}

export async function renameFile(req: Request, res: Response) {
  const { name } = req.body as NameInput;
  const file = await filesService.renameFile(req.params.id, name);
  res.json(file);
}

export async function deleteFile(req: Request, res: Response) {
  await filesService.deleteFile(req.params.id);
  res.status(204).end();
}

export async function restoreFile(req: Request, res: Response) {
  await filesService.restoreFile(req.params.id);
  res.status(204).end();
}

export async function getFile(req: Request, res: Response) {
  const file = await filesService.getFileById(req.params.id);
  res.json(file);
}
