import type { Request, Response } from "express";
import * as trashService from "../services/trash.service.js";
import type { TrashQuery } from "../../shared/types.js";

export async function listTrash(req: Request, res: Response) {
  const { dataroomId } = req.validatedQuery as TrashQuery;
  const entries = await trashService.listTrash(dataroomId);
  res.json(entries);
}

export async function restoreTrashEntry(req: Request, res: Response) {
  const { type, id } = req.params as { type: "dataroom" | "folder" | "file"; id: string };
  await trashService.restoreTrashEntry(type, id);
  res.status(204).end();
}

export async function emptyTrash(req: Request, res: Response) {
  const { dataroomId } = req.validatedQuery as TrashQuery;
  await trashService.emptyTrash(dataroomId);
  res.status(204).end();
}
