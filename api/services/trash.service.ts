import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { datarooms, folders, files } from "../db/schema";
import { ApiError } from "../lib/errors";
import { folderIsTrashRoot, restoreFolderById, purgeFolderPermanently } from "./folders.service";
import { fileIsTrashRoot, restoreFile, purgeFilePermanently } from "./files.service";
import { restoreDataroomById, purgeDataroomPermanently } from "./datarooms.service";
import type { EntityType, TrashEntry } from "@shared/types";

export async function listTrash(dataroomId?: string): Promise<TrashEntry[]> {
  await purgeExpiredTrash();

  const dataroomScope = dataroomId ? eq(datarooms.id, dataroomId) : undefined;
  const folderScope = dataroomId ? eq(folders.dataroomId, dataroomId) : undefined;
  const fileScope = dataroomId ? eq(files.dataroomId, dataroomId) : undefined;

  const [trashedDatarooms, trashedFolders, trashedFiles] = await Promise.all([
    db
      .select({ id: datarooms.id, name: datarooms.name, deletedAt: datarooms.deletedAt })
      .from(datarooms)
      .where(and(sql`${datarooms.deletedAt} is not null`, dataroomScope)),
    db
      .select({
        id: folders.id,
        name: folders.name,
        deletedAt: folders.deletedAt,
        dataroomId: folders.dataroomId,
        dataroomName: datarooms.name,
      })
      .from(folders)
      .innerJoin(datarooms, eq(datarooms.id, folders.dataroomId))
      .where(and(folderIsTrashRoot, isNull(datarooms.deletedAt), folderScope)),
    db
      .select({
        id: files.id,
        name: files.name,
        deletedAt: files.deletedAt,
        dataroomId: files.dataroomId,
        dataroomName: datarooms.name,
      })
      .from(files)
      .innerJoin(datarooms, eq(datarooms.id, files.dataroomId))
      .where(and(fileIsTrashRoot, isNull(datarooms.deletedAt), fileScope)),
  ]);

  const entries: TrashEntry[] = [
    ...trashedDatarooms.map(
      (d): TrashEntry => ({
        id: d.id,
        type: "dataroom",
        dataroomId: d.id,
        dataroomName: d.name,
        name: d.name,
        deletedAt: d.deletedAt!.toISOString(),
      }),
    ),
    ...trashedFolders.map(
      (f): TrashEntry => ({
        id: f.id,
        type: "folder",
        dataroomId: f.dataroomId,
        dataroomName: f.dataroomName,
        name: f.name,
        deletedAt: f.deletedAt!.toISOString(),
      }),
    ),
    ...trashedFiles.map(
      (f): TrashEntry => ({
        id: f.id,
        type: "file",
        dataroomId: f.dataroomId,
        dataroomName: f.dataroomName,
        name: f.name,
        deletedAt: f.deletedAt!.toISOString(),
      }),
    ),
  ];

  entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  return entries;
}

export async function restoreTrashEntry(entityType: EntityType, entityId: string): Promise<void> {
  if (entityType === "dataroom") return restoreDataroomById(entityId);
  if (entityType === "folder") return restoreFolderById(entityId);
  if (entityType === "file") return restoreFile(entityId);
  throw ApiError.badRequest("Unknown entity type");
}

export async function emptyTrash(dataroomId?: string): Promise<void> {
  const entries = await listTrash(dataroomId);
  for (const entry of entries) {
    if (entry.type === "dataroom") await purgeDataroomPermanently(entry.id);
    else if (entry.type === "folder") await purgeFolderPermanently(entry.id);
    else await purgeFilePermanently(entry.id);
  }
}

/** Lazily purges anything that's been sitting in the trash for 30+ days. Called on Trash reads. */
async function purgeExpiredTrash(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const expiredDatarooms = await db
    .select({ id: datarooms.id })
    .from(datarooms)
    .where(sql`${datarooms.deletedAt} is not null and ${datarooms.deletedAt} < ${cutoff}`);
  for (const dataroom of expiredDatarooms) {
    await purgeDataroomPermanently(dataroom.id);
  }

  const expiredRootFolders = await db
    .select({ id: folders.id })
    .from(folders)
    .where(sql`${folderIsTrashRoot} and ${folders.deletedAt} < ${cutoff}`);
  for (const folder of expiredRootFolders) {
    await purgeFolderPermanently(folder.id);
  }

  const expiredRootFiles = await db
    .select({ id: files.id })
    .from(files)
    .where(sql`${fileIsTrashRoot} and ${files.deletedAt} < ${cutoff}`);
  for (const file of expiredRootFiles) {
    await purgeFilePermanently(file.id);
  }
}
