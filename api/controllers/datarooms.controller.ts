import type { Request, Response } from "express";
import * as dataroomsService from "../services/datarooms.service";
import type { CreateDataroomInput, RenameInput, ContentsQuery } from "@shared/types";

export async function listDatarooms(_req: Request, res: Response) {
  const summaries = await dataroomsService.listDatarooms();
  res.json(summaries);
}

export async function createDataroom(req: Request, res: Response) {
  const { name } = req.body as CreateDataroomInput;
  const dataroom = await dataroomsService.createDataroom(name);
  res.status(201).json(dataroom);
}

export async function renameDataroom(req: Request, res: Response) {
  const { name } = req.body as RenameInput;
  const dataroom = await dataroomsService.renameDataroom(req.params.id, name);
  res.json(dataroom);
}

export async function deleteDataroom(req: Request, res: Response) {
  await dataroomsService.deleteDataroom(req.params.id);
  res.status(204).end();
}

export async function restoreDataroom(req: Request, res: Response) {
  await dataroomsService.restoreDataroomById(req.params.id);
  res.status(204).end();
}

export async function getDataroomContents(req: Request, res: Response) {
  const { folderId, search } = req.validatedQuery as ContentsQuery;
  const contents = await dataroomsService.getDataroomContents(req.params.id, folderId, search);
  res.json(contents);
}
