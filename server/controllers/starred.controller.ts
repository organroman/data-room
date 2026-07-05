import type { Request, Response } from "express";
import * as starredService from "../services/starred.service.js";
import type { StarEntityInput } from "../../shared/types.js";

export async function listStarred(_req: Request, res: Response) {
  const entries = await starredService.listStarredEntries();
  res.json(entries);
}

export async function starEntity(req: Request, res: Response) {
  const { entityType, entityId } = req.body as StarEntityInput;
  await starredService.starEntity(entityType, entityId);
  res.status(204).end();
}

export async function unstarEntity(req: Request, res: Response) {
  const { type, id } = req.params as { type: "dataroom" | "folder" | "file"; id: string };
  await starredService.unstarEntity(type, id);
  res.status(204).end();
}
