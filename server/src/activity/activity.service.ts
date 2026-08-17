import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import type { ActivityEntry } from "../../../shared/types.js";

const MAX_ACTIVITY_ROWS = 50;

// Owner-facing read of AccessLog (CLAUDE.md §6b) — the write side lives in
// SharesAccessService.assertCanView, which logs every non-owner ("share") view. This service
// only reads, scoped to a single dataroom's whole activity (dataroom + every folder/file in
// it), not one endpoint per resource — see ActivityEntry's doc comment in shared/types.ts.
@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getDataroomActivity(userId: string, dataroomId: string): Promise<ActivityEntry[]> {
    const dataroom = await this.prisma.dataroom.findFirst({
      where: { id: dataroomId, ownerId: userId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!dataroom) throw ApiException.notFound("Data room");

    // Not scoped to deletedAt:null — a resource that's since been trashed (or even purged)
    // still has real access history worth showing; purged resources just render with a
    // "resourceName: null" fallback below rather than being excluded.
    const [folderIds, fileIds] = await Promise.all([
      this.prisma.folder.findMany({ where: { dataroomId }, select: { id: true } }).then((r) => r.map((f) => f.id)),
      this.prisma.file.findMany({ where: { dataroomId }, select: { id: true } }).then((r) => r.map((f) => f.id)),
    ]);

    const resourceMatch: Prisma.AccessLogWhereInput[] = [
      { resourceType: "dataroom", resourceId: dataroomId },
      ...(folderIds.length ? [{ resourceType: "folder", resourceId: { in: folderIds } } as const] : []),
      ...(fileIds.length ? [{ resourceType: "file", resourceId: { in: fileIds } } as const] : []),
    ];

    const logs = await this.prisma.accessLog.findMany({
      where: { OR: resourceMatch },
      orderBy: { createdAt: "desc" },
      take: MAX_ACTIVITY_ROWS,
    });
    if (logs.length === 0) return [];

    const viewerIds = [...new Set(logs.flatMap((l) => (l.viewerUserId ? [l.viewerUserId] : [])))];
    const loggedFolderIds = [...new Set(logs.filter((l) => l.resourceType === "folder").map((l) => l.resourceId))];
    const loggedFileIds = [...new Set(logs.filter((l) => l.resourceType === "file").map((l) => l.resourceId))];

    const [viewers, folders, files] = await Promise.all([
      viewerIds.length
        ? this.prisma.user.findMany({ where: { id: { in: viewerIds } }, select: { id: true, name: true, email: true } })
        : [],
      loggedFolderIds.length
        ? this.prisma.folder.findMany({ where: { id: { in: loggedFolderIds } }, select: { id: true, name: true } })
        : [],
      loggedFileIds.length
        ? this.prisma.file.findMany({ where: { id: { in: loggedFileIds } }, select: { id: true, name: true } })
        : [],
    ]);

    const viewerById = new Map(viewers.map((v) => [v.id, v]));
    const folderNameById = new Map(folders.map((f) => [f.id, f.name]));
    const fileNameById = new Map(files.map((f) => [f.id, f.name]));

    return logs.map((log): ActivityEntry => {
      if (!log.shareId) {
        // Invariant from the write side: AccessLog rows are only ever created when
        // access.via === "share" (SharesAccessService.assertCanView), and both branches that
        // set via:"share" also set a shareId. A null here means that invariant broke.
        throw new Error(`AccessLog ${log.id} has via="share" semantics but no shareId — data integrity violation`);
      }
      return {
        id: log.id,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        resourceName:
          log.resourceType === "dataroom"
            ? dataroom.name
            : log.resourceType === "folder"
              ? (folderNameById.get(log.resourceId) ?? null)
              : (fileNameById.get(log.resourceId) ?? null),
        viewer: log.viewerUserId ? (viewerById.get(log.viewerUserId) ?? null) : null,
        shareId: log.shareId,
        createdAt: log.createdAt.toISOString(),
      };
    });
  }
}
