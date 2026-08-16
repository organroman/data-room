import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { SharesAccessService } from "../sharing/shares-access.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { FilesService } from "../files/files.service.js";

// New Phase 5 coverage for FilesService.moveFile — real integration tests, same style as
// dataroom-flows.test.ts. Covers: a successful move (including back to the root), the
// hard-reject-on-collision convention (matches rename, not upload's auto-suffix — see
// CLAUDE.md §6), cross-data-room rejection, and non-owner rejection.

const prisma = new PrismaService();
const blobService = new BlobService();
const starredService = new StarredService(prisma);
const sharesAccessService = new SharesAccessService(prisma);
const foldersService = new FoldersService(prisma, blobService);
const filesService = new FilesService(prisma, blobService, starredService, sharesAccessService);

let ownerId: string;
let strangerId: string;
let dataroomId: string;
let otherDataroomId: string;

beforeAll(async () => {
  await prisma.$connect();
  const suffix = crypto.randomUUID();
  const [owner, stranger] = await Promise.all([
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Owner", email: `mf-owner-${suffix}@example.com`, emailVerified: true } }),
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Stranger", email: `mf-stranger-${suffix}@example.com`, emailVerified: true } }),
  ]);
  ownerId = owner.id;
  strangerId = stranger.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  const [dataroom, other] = await Promise.all([
    prisma.dataroom.create({ data: { name: `Move Test ${crypto.randomUUID()}`, ownerId } }),
    prisma.dataroom.create({ data: { name: `Other Dataroom ${crypto.randomUUID()}`, ownerId } }),
  ]);
  dataroomId = dataroom.id;
  otherDataroomId = other.id;
});

afterEach(async () => {
  await prisma.dataroom.deleteMany({ where: { id: { in: [dataroomId, otherDataroomId] } } });
});

// ApiException (like every Nest HttpException) exposes its status via getStatus(), not a
// plain `.status` property, so `.rejects.toMatchObject({status})` would silently never match.
async function expectStatus(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toSatisfy((err) => (err as HttpException).getStatus() === status);
}

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

describe("moveFile", () => {
  it("moves a file into another folder, and back to the root", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Target");
    const file = await upload(null, "Doc.pdf");

    const moved = await filesService.moveFile(ownerId, file.id, folder.id);
    expect(moved.folderId).toBe(folder.id);

    const movedBack = await filesService.moveFile(ownerId, file.id, null);
    expect(movedBack.folderId).toBeNull();
  });

  it("rejects with a 409 on a name collision, without auto-suffixing", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Target");
    await upload(folder.id, "Doc.pdf");
    const toMove = await upload(null, "Doc.pdf");

    await expectStatus(filesService.moveFile(ownerId, toMove.id, folder.id), 409);
  });

  it("rejects moving into a folder from a different data room", async () => {
    const foreignFolder = await foldersService.createFolder(ownerId, otherDataroomId, null, "Foreign");
    const file = await upload(null, "Doc.pdf");

    await expectStatus(filesService.moveFile(ownerId, file.id, foreignFolder.id), 404);
  });

  it("rejects a move attempted by a non-owner", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Target");
    const file = await upload(null, "Doc.pdf");

    await expectStatus(filesService.moveFile(strangerId, file.id, folder.id), 404);
  });
});
