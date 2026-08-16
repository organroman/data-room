import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import type { CreateShareInput, EntityType, SharedWithMeEntry, ShareSummary } from "../../../shared/types.js";

type ShareWithGrantees = Prisma.ShareGetPayload<{ include: { grants: { include: { granteeUser: true } } } }>;

type ResourceFk = { dataroomId: string } | { folderId: string } | { fileId: string };

// Owner-facing share CRUD. Access resolution (who can *view* a shared resource) lives in
// shares-access.service.ts — this service is purely "create/list/revoke", and every method
// here requires the caller to already own the underlying dataroom. See CLAUDE.md §5/§6b.
@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService) {}

  async createShare(userId: string, input: CreateShareInput): Promise<ShareSummary> {
    await this.assertOwnsResource(userId, input.resourceType, input.resourceId);
    const resourceFk = this.resourceFk(input.resourceType, input.resourceId);

    if (input.mode === "public") {
      const share = await this.upsertPublicShare(userId, input, resourceFk);
      return this.serializeShare(share);
    }

    return this.serializeShare(await this.upsertPermissionedShare(userId, input, resourceFk));
  }

  private async upsertPublicShare(
    userId: string,
    input: CreateShareInput,
    resourceFk: ResourceFk,
  ): Promise<ShareWithGrantees> {
    const existing = await this.prisma.share.findFirst({
      where: { ...resourceFk, mode: "public", revokedAt: null },
      include: { grants: { include: { granteeUser: true } } },
    });
    const expiresAt = input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : undefined;

    if (existing) {
      // Idempotent: re-requesting a public link for the same resource returns the same
      // link rather than minting a duplicate — matches how e.g. Google Drive's "get link"
      // behaves, and avoids accumulating orphaned links nobody can find again.
      if (expiresAt === undefined) return existing;
      return this.prisma.share.update({
        where: { id: existing.id },
        data: { expiresAt },
        include: { grants: { include: { granteeUser: true } } },
      });
    }

    return this.prisma.share.create({
      data: {
        ...resourceFk,
        resourceType: input.resourceType,
        ownerId: userId,
        mode: "public",
        // crypto-random, not a UUID — deliberately higher entropy and non-sequential
        // (a share token is a bearer credential, unlike an internal row id).
        token: randomBytes(32).toString("base64url"),
        expiresAt: expiresAt ?? null,
      },
      include: { grants: { include: { granteeUser: true } } },
    });
  }

  private async upsertPermissionedShare(
    userId: string,
    input: CreateShareInput,
    resourceFk: ResourceFk,
  ): Promise<ShareWithGrantees> {
    const emails = [...new Set((input.granteeEmails ?? []).map((e) => e.trim().toLowerCase()))];
    const users = await this.prisma.user.findMany({ where: { email: { in: emails, mode: "insensitive" } } });
    const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const missing = emails.filter((e) => !foundEmails.has(e));
    if (missing.length > 0) {
      throw ApiException.badRequest(`No account found for: ${missing.join(", ")}`, { emails: missing });
    }

    let share = await this.prisma.share.findFirst({ where: { ...resourceFk, mode: "permissioned", revokedAt: null } });
    share ??= await this.prisma.share.create({
      data: { ...resourceFk, resourceType: input.resourceType, ownerId: userId, mode: "permissioned" },
    });

    await this.prisma.shareGrant.createMany({
      data: users.map((u) => ({ shareId: share!.id, granteeUserId: u.id })),
      skipDuplicates: true,
    });

    return this.prisma.share.findUniqueOrThrow({
      where: { id: share.id },
      include: { grants: { include: { granteeUser: true } } },
    });
  }

  async listSharesForResource(userId: string, resourceType: EntityType, resourceId: string): Promise<ShareSummary[]> {
    await this.assertOwnsResource(userId, resourceType, resourceId);
    const shares = await this.prisma.share.findMany({
      where: { ...this.resourceFk(resourceType, resourceId), revokedAt: null },
      include: { grants: { include: { granteeUser: true } } },
      orderBy: { createdAt: "asc" },
    });
    return shares.map((s) => this.serializeShare(s));
  }

  async revokeShare(userId: string, shareId: string): Promise<void> {
    const result = await this.prisma.share.updateMany({
      where: { id: shareId, ownerId: userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw ApiException.notFound("Share");
  }

  async revokeGrant(userId: string, shareId: string, grantId: string): Promise<void> {
    const share = await this.prisma.share.findFirst({ where: { id: shareId, ownerId: userId }, select: { id: true } });
    if (!share) throw ApiException.notFound("Share");
    await this.prisma.shareGrant.deleteMany({ where: { id: grantId, shareId } });
  }

  async listSharedWithMe(userId: string): Promise<SharedWithMeEntry[]> {
    const grants = await this.prisma.shareGrant.findMany({
      where: { granteeUserId: userId, share: { revokedAt: null } },
      include: { share: { include: { owner: true } } },
    });

    const dataroomGrants = grants.filter((g) => g.share.resourceType === "dataroom" && g.share.dataroomId);
    const folderGrants = grants.filter((g) => g.share.resourceType === "folder" && g.share.folderId);
    const fileGrants = grants.filter((g) => g.share.resourceType === "file" && g.share.fileId);

    const [datarooms, folders, files] = await Promise.all([
      dataroomGrants.length
        ? this.prisma.dataroom.findMany({
            where: { id: { in: dataroomGrants.map((g) => g.share.dataroomId!) }, deletedAt: null },
          })
        : [],
      folderGrants.length
        ? this.prisma.folder.findMany({
            where: { id: { in: folderGrants.map((g) => g.share.folderId!) }, deletedAt: null },
            include: { dataroom: { select: { name: true } } },
          })
        : [],
      fileGrants.length
        ? this.prisma.file.findMany({
            where: { id: { in: fileGrants.map((g) => g.share.fileId!) }, deletedAt: null },
            include: { dataroom: { select: { name: true } } },
          })
        : [],
    ]);

    const dataroomById = new Map(datarooms.map((d) => [d.id, d]));
    const folderById = new Map(folders.map((f) => [f.id, f]));
    const fileById = new Map(files.map((f) => [f.id, f]));

    const entries: SharedWithMeEntry[] = [];
    for (const g of dataroomGrants) {
      const d = dataroomById.get(g.share.dataroomId!);
      if (!d) continue;
      entries.push({
        shareId: g.share.id,
        entityType: "dataroom",
        entityId: d.id,
        dataroomId: d.id,
        dataroomName: d.name,
        name: d.name,
        ownerName: g.share.owner.name,
        ownerEmail: g.share.owner.email,
      });
    }
    for (const g of folderGrants) {
      const f = folderById.get(g.share.folderId!);
      if (!f) continue;
      entries.push({
        shareId: g.share.id,
        entityType: "folder",
        entityId: f.id,
        dataroomId: f.dataroomId,
        dataroomName: f.dataroom.name,
        name: f.name,
        ownerName: g.share.owner.name,
        ownerEmail: g.share.owner.email,
      });
    }
    for (const g of fileGrants) {
      const f = fileById.get(g.share.fileId!);
      if (!f) continue;
      entries.push({
        shareId: g.share.id,
        entityType: "file",
        entityId: f.id,
        dataroomId: f.dataroomId,
        dataroomName: f.dataroom.name,
        name: f.name,
        ownerName: g.share.owner.name,
        ownerEmail: g.share.owner.email,
        folderId: f.folderId,
        mimeType: f.mimeType,
      });
    }
    return entries;
  }

  private resourceFk(resourceType: EntityType, resourceId: string): ResourceFk {
    if (resourceType === "dataroom") return { dataroomId: resourceId };
    if (resourceType === "folder") return { folderId: resourceId };
    return { fileId: resourceId };
  }

  private async assertOwnsResource(userId: string, resourceType: EntityType, resourceId: string): Promise<void> {
    const dataroomId = await this.resolveDataroomId(resourceType, resourceId);
    const what = resourceType === "dataroom" ? "Data room" : resourceType === "folder" ? "Folder" : "File";
    if (!dataroomId) throw ApiException.notFound(what);
    const owned = await this.prisma.dataroom.findFirst({
      where: { id: dataroomId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!owned) throw ApiException.notFound(what);
  }

  private async resolveDataroomId(resourceType: EntityType, resourceId: string): Promise<string | null> {
    if (resourceType === "dataroom") {
      const d = await this.prisma.dataroom.findFirst({ where: { id: resourceId, deletedAt: null }, select: { id: true } });
      return d?.id ?? null;
    }
    if (resourceType === "folder") {
      const f = await this.prisma.folder.findFirst({
        where: { id: resourceId, deletedAt: null },
        select: { dataroomId: true },
      });
      return f?.dataroomId ?? null;
    }
    const f = await this.prisma.file.findFirst({
      where: { id: resourceId, deletedAt: null },
      select: { dataroomId: true },
    });
    return f?.dataroomId ?? null;
  }

  private serializeShare(share: ShareWithGrantees): ShareSummary {
    const resourceId = share.dataroomId ?? share.folderId ?? share.fileId;
    if (!resourceId) {
      throw new Error(`Share ${share.id} has no resource FK set — data integrity violation`);
    }
    return {
      id: share.id,
      resourceType: share.resourceType,
      resourceId,
      mode: share.mode,
      token: share.token,
      createdAt: share.createdAt.toISOString(),
      expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
      grantees: share.grants.map((g) => ({
        id: g.id,
        userId: g.granteeUserId,
        email: g.granteeUser.email,
        name: g.granteeUser.name,
      })),
    };
  }
}
