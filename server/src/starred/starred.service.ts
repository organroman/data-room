import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import type { EntityType, StarredEntry } from "../../../shared/types.js";

// Port of v1's server/services/starred.service.ts, now scoped to a real userId instead of
// the always-null placeholder column v1 used pre-auth (see CLAUDE.md §3).
//
// starred_items.entityId is a polymorphic reference (no declared Prisma relation, same as
// v1's Drizzle schema) — Prisma can't join across it directly, so listStarredEntries does a
// two-step fetch (ids, then the matching rows per entity type) and merges in JS instead of
// v1's single SQL JOIN. Standard workaround for polymorphic associations in Prisma.
@Injectable()
export class StarredService {
  constructor(private readonly prisma: PrismaService) {}

  async getStarredIds(userId: string, entityType: EntityType): Promise<Set<string>> {
    const rows = await this.prisma.starredItem.findMany({
      where: { entityType, userId },
      select: { entityId: true },
    });
    return new Set(rows.map((r) => r.entityId));
  }

  async starEntity(userId: string, entityType: EntityType, entityId: string): Promise<void> {
    await this.assertOwnsEntity(userId, entityType, entityId);
    await this.prisma.starredItem.upsert({
      where: { entityType_entityId_userId: { entityType, entityId, userId } },
      create: { entityType, entityId, userId },
      update: {},
    });
  }

  async unstarEntity(userId: string, entityType: EntityType, entityId: string): Promise<void> {
    await this.prisma.starredItem.deleteMany({ where: { entityType, entityId, userId } });
  }

  async listStarredEntries(userId: string): Promise<StarredEntry[]> {
    const starredRows = await this.prisma.starredItem.findMany({ where: { userId } });

    const dataroomIds = starredRows.filter((r) => r.entityType === "dataroom").map((r) => r.entityId);
    const folderIds = starredRows.filter((r) => r.entityType === "folder").map((r) => r.entityId);
    const fileIds = starredRows.filter((r) => r.entityType === "file").map((r) => r.entityId);

    const [starredDatarooms, starredFolders, starredFiles] = await Promise.all([
      dataroomIds.length
        ? this.prisma.dataroom.findMany({ where: { id: { in: dataroomIds }, deletedAt: null } })
        : [],
      folderIds.length
        ? this.prisma.folder.findMany({
            where: { id: { in: folderIds }, deletedAt: null, dataroom: { deletedAt: null } },
            include: { dataroom: { select: { name: true } } },
          })
        : [],
      fileIds.length
        ? this.prisma.file.findMany({
            where: { id: { in: fileIds }, deletedAt: null, dataroom: { deletedAt: null } },
            include: { dataroom: { select: { name: true } } },
          })
        : [],
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
          dataroomName: f.dataroom.name,
          name: f.name,
        }),
      ),
      ...starredFiles.map(
        (f): StarredEntry => ({
          entityType: "file",
          entityId: f.id,
          dataroomId: f.dataroomId,
          dataroomName: f.dataroom.name,
          name: f.name,
          mimeType: f.mimeType,
          folderId: f.folderId,
        }),
      ),
    ];
  }

  private async assertOwnsEntity(userId: string, entityType: EntityType, entityId: string): Promise<void> {
    const owned =
      entityType === "dataroom"
        ? await this.prisma.dataroom.findFirst({ where: { id: entityId, ownerId: userId, deletedAt: null } })
        : entityType === "folder"
          ? await this.prisma.folder.findFirst({
              where: { id: entityId, deletedAt: null, dataroom: { ownerId: userId, deletedAt: null } },
            })
          : await this.prisma.file.findFirst({
              where: { id: entityId, deletedAt: null, dataroom: { ownerId: userId, deletedAt: null } },
            });
    if (!owned) {
      throw ApiException.notFound(
        entityType === "dataroom" ? "Data room" : entityType === "folder" ? "Folder" : "File",
      );
    }
  }
}
