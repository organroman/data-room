import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { FoldersService, folderTrashRootWhere } from "../folders/folders.service.js";
import { FilesService, fileTrashRootWhere } from "../files/files.service.js";
import { DataroomsService } from "../datarooms/datarooms.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import type { EntityType, TrashEntry } from "../../../shared/types.js";

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Port of v1's server/services/trash.service.ts, scoped to a real owner throughout — see
// CLAUDE.md §4. The 30-day expiry sweep (purgeExpiredTrash) stays global/unscoped, same as
// v1 — it's housekeeping across all users' data, not a per-request user action.
@Injectable()
export class TrashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foldersService: FoldersService,
    private readonly filesService: FilesService,
    private readonly dataroomsService: DataroomsService,
  ) {}

  async listTrash(userId: string, dataroomId?: string): Promise<TrashEntry[]> {
    await this.purgeExpiredTrash();

    const [trashedDatarooms, trashedFolders, trashedFiles] = await Promise.all([
      this.prisma.dataroom.findMany({
        where: { ownerId: userId, deletedAt: { not: null }, ...(dataroomId ? { id: dataroomId } : {}) },
      }),
      this.prisma.folder.findMany({
        where: {
          ...folderTrashRootWhere(),
          dataroom: { ownerId: userId, deletedAt: null },
          ...(dataroomId ? { dataroomId } : {}),
        },
        include: { dataroom: { select: { name: true } } },
      }),
      this.prisma.file.findMany({
        where: {
          ...fileTrashRootWhere(),
          dataroom: { ownerId: userId, deletedAt: null },
          ...(dataroomId ? { dataroomId } : {}),
        },
        include: { dataroom: { select: { name: true } } },
      }),
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
          dataroomName: f.dataroom.name,
          name: f.name,
          deletedAt: f.deletedAt!.toISOString(),
        }),
      ),
      ...trashedFiles.map(
        (f): TrashEntry => ({
          id: f.id,
          type: "file",
          dataroomId: f.dataroomId,
          dataroomName: f.dataroom.name,
          name: f.name,
          deletedAt: f.deletedAt!.toISOString(),
        }),
      ),
    ];

    entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    return entries;
  }

  async restoreTrashEntry(userId: string, entityType: EntityType, entityId: string): Promise<void> {
    if (entityType === "dataroom") return this.dataroomsService.restoreDataroomById(userId, entityId);
    if (entityType === "folder") return this.foldersService.restoreFolderById(userId, entityId);
    if (entityType === "file") return this.filesService.restoreFile(userId, entityId);
    throw ApiException.badRequest("Unknown entity type");
  }

  async emptyTrash(userId: string, dataroomId?: string): Promise<void> {
    const entries = await this.listTrash(userId, dataroomId);
    for (const entry of entries) {
      if (entry.type === "dataroom") await this.dataroomsService.purgeDataroomPermanently(entry.id);
      else if (entry.type === "folder") await this.foldersService.purgeFolderPermanently(entry.id);
      else await this.filesService.purgeFilePermanently(entry.id);
    }
  }

  /** Lazily purges anything that's been sitting in the trash for 30+ days. Called on Trash reads. */
  private async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);

    const expiredDatarooms = await this.prisma.dataroom.findMany({
      where: { deletedAt: { not: null, lt: cutoff } },
      select: { id: true },
    });
    for (const dataroom of expiredDatarooms) {
      await this.dataroomsService.purgeDataroomPermanently(dataroom.id);
    }

    const expiredRootFolders = await this.prisma.folder.findMany({
      where: folderTrashRootWhere({ not: null, lt: cutoff }),
      select: { id: true },
    });
    for (const folder of expiredRootFolders) {
      await this.foldersService.purgeFolderPermanently(folder.id);
    }

    const expiredRootFiles = await this.prisma.file.findMany({
      where: fileTrashRootWhere({ not: null, lt: cutoff }),
      select: { id: true },
    });
    for (const file of expiredRootFiles) {
      await this.filesService.purgeFilePermanently(file.id);
    }
  }
}
