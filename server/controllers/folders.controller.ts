import type { Request, Response } from "express";
import * as foldersService from "../services/folders.service";
import type { CreateFolderInput } from "@shared/types";
import type { NameInput } from "@shared/validation";

export async function createFolder(req: Request, res: Response) {
  const { dataroomId, parentFolderId, name } = req.body as CreateFolderInput;
  const folder = await foldersService.createFolder(dataroomId, parentFolderId, name);
  res.status(201).json(folder);
}

export async function renameFolder(req: Request, res: Response) {
  const { name } = req.body as NameInput;
  const folder = await foldersService.renameFolder(req.params.id, name);
  res.json(folder);
}

export async function deleteFolder(req: Request, res: Response) {
  await foldersService.deleteFolder(req.params.id);
  res.status(204).end();
}

export async function restoreFolder(req: Request, res: Response) {
  await foldersService.restoreFolderById(req.params.id);
  res.status(204).end();
}
