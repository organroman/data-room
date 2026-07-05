import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { starredItems, datarooms, folders, files } from "../db/schema.js";
import type { EntityType, StarredEntry } from "../../shared/types.js";

/** Returns the set of entityIds of the given type that are starred by the (implicit, single) owner. */
export async function getStarredIds(entityType: EntityType): Promise<Set<string>> {
  const rows = await db
    .select({ entityId: starredItems.entityId })
    .from(starredItems)
    .where(and(eq(starredItems.entityType, entityType), isNull(starredItems.userId)));
  return new Set(rows.map((r) => r.entityId));
}

export async function starEntity(entityType: EntityType, entityId: string): Promise<void> {
  await db.insert(starredItems).values({ entityType, entityId, userId: null }).onConflictDoNothing();
}

export async function unstarEntity(entityType: EntityType, entityId: string): Promise<void> {
  await db
    .delete(starredItems)
    .where(
      and(
        eq(starredItems.entityType, entityType),
        eq(starredItems.entityId, entityId),
        isNull(starredItems.userId),
      ),
    );
}

export async function listStarredEntries(): Promise<StarredEntry[]> {
  const [starredDatarooms, starredFolders, starredFiles] = await Promise.all([
    db
      .select({ id: datarooms.id, name: datarooms.name })
      .from(starredItems)
      .innerJoin(datarooms, eq(datarooms.id, starredItems.entityId))
      .where(
        and(eq(starredItems.entityType, "dataroom"), isNull(starredItems.userId), isNull(datarooms.deletedAt)),
      ),
    db
      .select({ id: folders.id, name: folders.name, dataroomId: folders.dataroomId, dataroomName: datarooms.name })
      .from(starredItems)
      .innerJoin(folders, eq(folders.id, starredItems.entityId))
      .innerJoin(datarooms, eq(datarooms.id, folders.dataroomId))
      .where(
        and(
          eq(starredItems.entityType, "folder"),
          isNull(starredItems.userId),
          isNull(folders.deletedAt),
          isNull(datarooms.deletedAt),
        ),
      ),
    db
      .select({
        id: files.id,
        name: files.name,
        dataroomId: files.dataroomId,
        dataroomName: datarooms.name,
        mimeType: files.mimeType,
        folderId: files.folderId,
      })
      .from(starredItems)
      .innerJoin(files, eq(files.id, starredItems.entityId))
      .innerJoin(datarooms, eq(datarooms.id, files.dataroomId))
      .where(
        and(
          eq(starredItems.entityType, "file"),
          isNull(starredItems.userId),
          isNull(files.deletedAt),
          isNull(datarooms.deletedAt),
        ),
      ),
  ]);

  return [
    ...starredDatarooms.map(
      (d): StarredEntry => ({
        entityType: "dataroom",
        entityId: d.id,
        dataroomId: d.id,
        dataroomName: d.name,
        name: d.name,
      }),
    ),
    ...starredFolders.map(
      (f): StarredEntry => ({
        entityType: "folder",
        entityId: f.id,
        dataroomId: f.dataroomId,
        dataroomName: f.dataroomName,
        name: f.name,
      }),
    ),
    ...starredFiles.map(
      (f): StarredEntry => ({
        entityType: "file",
        entityId: f.id,
        dataroomId: f.dataroomId,
        dataroomName: f.dataroomName,
        name: f.name,
        mimeType: f.mimeType,
        folderId: f.folderId,
      }),
    ),
  ];
}
