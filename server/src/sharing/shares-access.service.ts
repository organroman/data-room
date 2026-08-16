import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import type { EntityType } from "../../../shared/types.js";

interface Ancestry {
  dataroomId: string;
  /** Includes the folder itself (when resourceType is "folder") plus every ancestor up to root. */
  ancestorFolderIds: string[];
}

interface ViewAccess {
  allowed: boolean;
  via?: "owner" | "share";
  shareId?: string;
}

/**
 * Core access-resolution algorithm for sharing — see CLAUDE.md §5. Answers "can user U (or
 * an anonymous request carrying token T) view resource R", covering: direct ownership, a
 * permissioned grant on the resource or an ancestor (dataroom/folder), or a valid public-link
 * token on the resource or an ancestor. This single service is what makes "sharing a folder
 * shares its whole subtree" work — the ancestor-chain-membership check happens on the *target*
 * resource being viewed, not the share's own resource.
 */
@Injectable()
export class SharesAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws 404 (not 403 — don't leak existence of private resources) if access is denied. */
  async assertCanView(
    resourceType: EntityType,
    resourceId: string,
    userId: string | undefined,
    token: string | undefined,
    ipAddress?: string,
  ): Promise<ViewAccess> {
    const access = await this.resolveAccess(resourceType, resourceId, userId, token);
    if (!access.allowed) {
      throw ApiException.notFound(
        resourceType === "dataroom" ? "Data room" : resourceType === "folder" ? "Folder" : "File",
      );
    }
    // Only shared (non-owner) views are worth logging — an owner viewing their own data isn't
    // "activity" a due-diligence seller needs to know about.
    if (access.via === "share") {
      await this.recordAccess(resourceType, resourceId, userId, access.shareId, ipAddress);
    }
    return access;
  }

  async resolveAccess(
    resourceType: EntityType,
    resourceId: string,
    userId: string | undefined,
    token: string | undefined,
  ): Promise<ViewAccess> {
    const ancestry = await this.resolveAncestry(resourceType, resourceId);
    if (!ancestry) return { allowed: false };
    const { dataroomId, ancestorFolderIds } = ancestry;

    if (userId) {
      const owned = await this.prisma.dataroom.findFirst({
        where: { id: dataroomId, ownerId: userId, deletedAt: null },
        select: { id: true },
      });
      if (owned) return { allowed: true, via: "owner" };
    }

    const resourceMatch = [
      { dataroomId },
      ...(ancestorFolderIds.length ? [{ folderId: { in: ancestorFolderIds } }] : []),
      ...(resourceType === "file" ? [{ fileId: resourceId }] : []),
    ];

    if (userId) {
      const grant = await this.prisma.share.findFirst({
        where: {
          mode: "permissioned",
          revokedAt: null,
          grants: { some: { granteeUserId: userId } },
          OR: resourceMatch,
        },
        select: { id: true },
      });
      if (grant) return { allowed: true, via: "share", shareId: grant.id };
    }

    if (token) {
      const share = await this.prisma.share.findFirst({
        where: {
          mode: "public",
          token,
          revokedAt: null,
          AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, { OR: resourceMatch }],
        },
        select: { id: true },
      });
      if (share) return { allowed: true, via: "share", shareId: share.id };
    }

    return { allowed: false };
  }

  private async resolveAncestry(resourceType: EntityType, resourceId: string): Promise<Ancestry | null> {
    if (resourceType === "dataroom") {
      const dataroom = await this.prisma.dataroom.findUnique({
        where: { id: resourceId },
        select: { id: true, deletedAt: true },
      });
      if (!dataroom || dataroom.deletedAt) return null;
      return { dataroomId: dataroom.id, ancestorFolderIds: [] };
    }

    if (resourceType === "folder") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: resourceId },
        select: { id: true, dataroomId: true, deletedAt: true },
      });
      if (!folder || folder.deletedAt) return null;
      return { dataroomId: folder.dataroomId, ancestorFolderIds: await this.getFolderAncestorIds(resourceId) };
    }

    const file = await this.prisma.file.findUnique({
      where: { id: resourceId },
      select: { id: true, dataroomId: true, folderId: true, deletedAt: true },
    });
    if (!file || file.deletedAt) return null;
    return {
      dataroomId: file.dataroomId,
      ancestorFolderIds: file.folderId ? await this.getFolderAncestorIds(file.folderId) : [],
    };
  }

  /** Walks parentFolderId up from `folderId` to the dataroom root — mirrors the breadcrumbs CTE in datarooms.service.ts. */
  private async getFolderAncestorIds(folderId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE ancestors AS (
        SELECT id, "parentFolderId" FROM folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id, f."parentFolderId" FROM folders f JOIN ancestors a ON f.id = a."parentFolderId"
      )
      SELECT id FROM ancestors
    `;
    return rows.map((row) => row.id);
  }

  private async recordAccess(
    resourceType: EntityType,
    resourceId: string,
    viewerUserId: string | undefined,
    shareId: string | undefined,
    ipAddress: string | undefined,
  ): Promise<void> {
    await this.prisma.accessLog.create({
      data: { resourceType, resourceId, viewerUserId: viewerUserId ?? null, shareId: shareId ?? null, ipAddress: ipAddress ?? null },
    });
  }
}
