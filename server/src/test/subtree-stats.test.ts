import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { SharesAccessService } from "../sharing/shares-access.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { FilesService } from "../files/files.service.js";

// New Phase 5 coverage for FoldersService.getSubtreeStats — the delete-warning dialog's data
// source. Covers: an empty folder, a nested tree of folders/files (root excluded from the
// folder count, nested files included), already-deleted descendants not counted, and
// non-owner rejection.

const prisma = new PrismaService();
const blobService = new BlobService();
const starredService = new StarredService(prisma);
const sharesAccessService = new SharesAccessService(prisma);
const foldersService = new FoldersService(prisma, blobService);
const filesService = new FilesService(prisma, blobService, starredService, sharesAccessService);

let ownerId: string;
let strangerId: string;
let dataroomId: string;

beforeAll(async () => {
  await prisma.$connect();
  const suffix = crypto.randomUUID();
  const [owner, stranger] = await Promise.all([
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Owner", email: `st-owner-${suffix}@example.com`, emailVerified: true } }),
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Stranger", email: `st-stranger-${suffix}@example.com`, emailVerified: true } }),
  ]);
  ownerId = owner.id;
  strangerId = stranger.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  const dataroom = await prisma.dataroom.create({ data: { name: `Subtree Test ${crypto.randomUUID()}`, ownerId } });
  dataroomId = dataroom.id;
});

afterEach(async () => {
  await prisma.dataroom.delete({ where: { id: dataroomId } });
});

async function upload(folderId: string | null, name: string) {
  const result = await filesService.confirmFileUpload(ownerId, {
    dataroomId,
    folderId,
    name,
    size: 100,
    blobUrl: `https://example.public.blob.vercel-storage.com/${crypto.randomUUID()}.pdf`,
    blobPathname: `${crypto.randomUUID()}.pdf`,
  });
  return result.file;
}

describe("getSubtreeStats", () => {
  it("returns zero counts for an empty folder", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Empty");
    const stats = await foldersService.getSubtreeStats(ownerId, folder.id);
    expect(stats).toEqual({ folderCount: 0, fileCount: 0 });
  });

  it("counts nested folders (excluding the root) and all nested files", async () => {
    const root = await foldersService.createFolder(ownerId, dataroomId, null, "Root");
    const child = await foldersService.createFolder(ownerId, dataroomId, root.id, "Child");
    await foldersService.createFolder(ownerId, dataroomId, child.id, "Grandchild");
    await upload(root.id, "InRoot.pdf");
    await upload(child.id, "InChild.pdf");

    const stats = await foldersService.getSubtreeStats(ownerId, root.id);
    // 2 nested folders (Child, Grandchild) — Root itself isn't counted.
    expect(stats).toEqual({ folderCount: 2, fileCount: 2 });
  });

  it("doesn't count already-deleted descendants", async () => {
    const root = await foldersService.createFolder(ownerId, dataroomId, null, "Root");
    const child = await foldersService.createFolder(ownerId, dataroomId, root.id, "Child");
    await upload(root.id, "Survivor.pdf");
    const toDelete = await upload(root.id, "AlreadyGone.pdf");
    await filesService.deleteFile(ownerId, toDelete.id);
    await foldersService.deleteFolder(ownerId, child.id);

    const stats = await foldersService.getSubtreeStats(ownerId, root.id);
    expect(stats).toEqual({ folderCount: 0, fileCount: 1 });
  });

  it("rejects a non-owner with 404", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Private");
    await expect(foldersService.getSubtreeStats(strangerId, folder.id)).rejects.toSatisfy(
      (err) => (err as HttpException).getStatus() === 404,
    );
  });
});
