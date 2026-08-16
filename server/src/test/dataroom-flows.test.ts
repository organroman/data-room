import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { DataroomsService } from "../datarooms/datarooms.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { FilesService } from "../files/files.service.js";
import { TrashService } from "../trash/trash.service.js";

// Port of v1's server/services/dataRoomFlows.test.ts, against the v2 Nest+Prisma stack — real
// integration tests against the local data_room_v2 Postgres database (no mocking), covering the
// two behaviors that are easy to get subtly wrong: recursive folder soft-delete/restore, and
// duplicate-file-name auto-suffixing on upload. See CLAUDE.md §8. Services are plain
// constructor-injected classes, so they're instantiated directly here rather than through
// Nest's DI container — no framework bootstrap needed to call their methods against a real DB.
// None of these tests upload real files or call the Vercel Blob API, so BLOB_READ_WRITE_TOKEN
// doesn't need to be configured to run them.

const prisma = new PrismaService();
const blobService = new BlobService();
const starredService = new StarredService(prisma);
const dataroomsService = new DataroomsService(prisma, blobService, starredService);
const foldersService = new FoldersService(prisma, blobService);
const filesService = new FilesService(prisma, blobService, starredService);
const trashService = new TrashService(prisma, foldersService, filesService, dataroomsService);

let userId: string;
let dataroomId: string;

beforeAll(async () => {
  await prisma.$connect();
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Test User",
      email: `test-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  const dataroom = await dataroomsService.createDataroom(userId, `Test Dataroom ${crypto.randomUUID()}`);
  dataroomId = dataroom.id;
});

afterEach(async () => {
  // Direct hard-delete (FK cascade) instead of the service-layer purge, since purge would
  // call the real Blob API's del() for file cleanup.
  await prisma.dataroom.delete({ where: { id: dataroomId } });
});

describe("recursive folder soft-delete / restore", () => {
  it("cascades delete to descendants, but Trash only lists the deleted root", async () => {
    const parent = await foldersService.createFolder(userId, dataroomId, null, "Parent");
    const child = await foldersService.createFolder(userId, dataroomId, parent.id, "Child");
    const grandchild = await foldersService.createFolder(userId, dataroomId, child.id, "Grandchild");

    await foldersService.deleteFolder(userId, parent.id);

    const trash = await trashService.listTrash(userId, dataroomId);
    const trashIds = trash.map((entry) => entry.id);
    expect(trashIds).toContain(parent.id);
    expect(trashIds).not.toContain(child.id);
    expect(trashIds).not.toContain(grandchild.id);

    // Descendants are soft-deleted too, even though they don't get their own Trash row.
    const childRow = await prisma.folder.findUniqueOrThrow({ where: { id: child.id } });
    const grandchildRow = await prisma.folder.findUniqueOrThrow({ where: { id: grandchild.id } });
    expect(childRow.deletedAt).not.toBeNull();
    expect(grandchildRow.deletedAt).not.toBeNull();
  });

  it("restoring the root brings the whole subtree back", async () => {
    const parent = await foldersService.createFolder(userId, dataroomId, null, "Parent");
    const child = await foldersService.createFolder(userId, dataroomId, parent.id, "Child");

    await foldersService.deleteFolder(userId, parent.id);
    await trashService.restoreTrashEntry(userId, "folder", parent.id);

    const parentRow = await prisma.folder.findUniqueOrThrow({ where: { id: parent.id } });
    const childRow = await prisma.folder.findUniqueOrThrow({ where: { id: child.id } });
    expect(parentRow.deletedAt).toBeNull();
    expect(childRow.deletedAt).toBeNull();

    const trash = await trashService.listTrash(userId, dataroomId);
    expect(trash.map((entry) => entry.id)).not.toContain(parent.id);
  });
});

describe("duplicate file name resolution on upload", () => {
  it("auto-suffixes a colliding name instead of rejecting", async () => {
    const first = await filesService.confirmFileUpload(userId, {
      dataroomId,
      folderId: null,
      name: "Summary.pdf",
      size: 1000,
      blobUrl: "https://example.public.blob.vercel-storage.com/summary-abc.pdf",
      blobPathname: "summary-abc.pdf",
    });
    expect(first.renamed).toBe(false);
    expect(first.file.name).toBe("Summary.pdf");

    const second = await filesService.confirmFileUpload(userId, {
      dataroomId,
      folderId: null,
      name: "Summary.pdf",
      size: 2000,
      blobUrl: "https://example.public.blob.vercel-storage.com/summary-def.pdf",
      blobPathname: "summary-def.pdf",
    });
    expect(second.renamed).toBe(true);
    expect(second.file.name).toBe("Summary (1).pdf");

    const third = await filesService.confirmFileUpload(userId, {
      dataroomId,
      folderId: null,
      name: "Summary.pdf",
      size: 3000,
      blobUrl: "https://example.public.blob.vercel-storage.com/summary-ghi.pdf",
      blobPathname: "summary-ghi.pdf",
    });
    expect(third.renamed).toBe(true);
    expect(third.file.name).toBe("Summary (2).pdf");
  });

  it("does not rename a file whose name doesn't collide", async () => {
    const result = await filesService.confirmFileUpload(userId, {
      dataroomId,
      folderId: null,
      name: "Unique.pdf",
      size: 500,
      blobUrl: "https://example.public.blob.vercel-storage.com/unique-abc.pdf",
      blobPathname: "unique-abc.pdf",
    });
    expect(result.renamed).toBe(false);
    expect(result.file.name).toBe("Unique.pdf");
  });
});
