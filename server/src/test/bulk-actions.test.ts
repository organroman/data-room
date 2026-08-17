import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { SharesAccessService } from "../sharing/shares-access.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { FilesService } from "../files/files.service.js";

// New Phase 5 coverage for the bulk-select actions (FoldersService.bulkSoftDelete,
// FilesService.bulkDelete/bulkMove) — real integration tests, same style as the rest of
// server/src/test/. Covers: bulk-deleting a mix of folders (with their own nested contents)
// and standalone files in one call each, bulk-moving files with a partial name collision
// (best-effort, not all-or-nothing — see files.service.ts's doc comment), and that ids
// belonging to another user are silently excluded rather than failing the whole batch.

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
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Owner", email: `bulk-owner-${suffix}@example.com`, emailVerified: true } }),
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Stranger", email: `bulk-stranger-${suffix}@example.com`, emailVerified: true } }),
  ]);
  ownerId = owner.id;
  strangerId = stranger.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  const dataroom = await prisma.dataroom.create({ data: { name: `Bulk Test ${crypto.randomUUID()}`, ownerId } });
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

describe("bulkSoftDelete (folders)", () => {
  it("deletes multiple folders, cascading each one's own contents", async () => {
    const folderA = await foldersService.createFolder(ownerId, dataroomId, null, "A");
    const folderB = await foldersService.createFolder(ownerId, dataroomId, null, "B");
    const childOfA = await foldersService.createFolder(ownerId, dataroomId, folderA.id, "Child of A");

    await foldersService.bulkSoftDelete(ownerId, [folderA.id, folderB.id]);

    const [aRow, bRow, childRow] = await Promise.all([
      prisma.folder.findUniqueOrThrow({ where: { id: folderA.id } }),
      prisma.folder.findUniqueOrThrow({ where: { id: folderB.id } }),
      prisma.folder.findUniqueOrThrow({ where: { id: childOfA.id } }),
    ]);
    expect(aRow.deletedAt).not.toBeNull();
    expect(bRow.deletedAt).not.toBeNull();
    expect(childRow.deletedAt).not.toBeNull();
  });

  it("silently excludes a folder id belonging to another user", async () => {
    const mine = await foldersService.createFolder(ownerId, dataroomId, null, "Mine");

    const otherDataroom = await prisma.dataroom.create({ data: { name: "Other", ownerId: strangerId } });
    const notMine = await foldersService.createFolder(strangerId, otherDataroom.id, null, "Not mine");

    await foldersService.bulkSoftDelete(ownerId, [mine.id, notMine.id]);

    const [mineRow, notMineRow] = await Promise.all([
      prisma.folder.findUniqueOrThrow({ where: { id: mine.id } }),
      prisma.folder.findUniqueOrThrow({ where: { id: notMine.id } }),
    ]);
    expect(mineRow.deletedAt).not.toBeNull();
    expect(notMineRow.deletedAt).toBeNull();

    await prisma.dataroom.delete({ where: { id: otherDataroom.id } });
  });
});

describe("bulkDelete (files)", () => {
  it("deletes multiple files in one call", async () => {
    const fileA = await upload(null, "A.pdf");
    const fileB = await upload(null, "B.pdf");

    await filesService.bulkDelete(ownerId, [fileA.id, fileB.id]);

    const [aRow, bRow] = await Promise.all([
      prisma.file.findUniqueOrThrow({ where: { id: fileA.id } }),
      prisma.file.findUniqueOrThrow({ where: { id: fileB.id } }),
    ]);
    expect(aRow.deletedAt).not.toBeNull();
    expect(bRow.deletedAt).not.toBeNull();
  });
});

describe("bulkMove (files)", () => {
  it("moves files that don't collide, and counts (without moving) the ones that do", async () => {
    const target = await foldersService.createFolder(ownerId, dataroomId, null, "Target");
    await upload(target.id, "Collides.pdf"); // pre-existing file with a colliding name

    const clean = await upload(null, "Clean.pdf");
    const colliding = await upload(null, "Collides.pdf");

    const result = await filesService.bulkMove(ownerId, [clean.id, colliding.id], target.id);
    expect(result).toEqual({ movedCount: 1, conflictCount: 1 });

    const [cleanRow, collidingRow] = await Promise.all([
      prisma.file.findUniqueOrThrow({ where: { id: clean.id } }),
      prisma.file.findUniqueOrThrow({ where: { id: colliding.id } }),
    ]);
    expect(cleanRow.folderId).toBe(target.id);
    expect(collidingRow.folderId).toBeNull(); // left in place, not silently renamed
  });
});
