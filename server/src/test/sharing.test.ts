import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { DataroomsService } from "../datarooms/datarooms.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { FilesService } from "../files/files.service.js";
import { SharesAccessService } from "../sharing/shares-access.service.js";
import { SharesService } from "../sharing/shares.service.js";

// New Phase 3 coverage for the sharing access-resolution algorithm (CLAUDE.md §5/§8) — real
// integration tests against the local Postgres database, same style as dataroom-flows.test.ts.
// Covers: ownership, permissioned grants (dataroom-level and folder-level, including the
// subtree-vs-sibling boundary), public tokens (valid/wrong/missing/expired), revocation, and
// that shared/granted access never extends to mutation.

const prisma = new PrismaService();
const blobService = new BlobService();
const starredService = new StarredService(prisma);
const sharesAccessService = new SharesAccessService(prisma);
const sharesService = new SharesService(prisma);
const dataroomsService = new DataroomsService(prisma, blobService, starredService, sharesAccessService);
const foldersService = new FoldersService(prisma, blobService);
const filesService = new FilesService(prisma, blobService, starredService, sharesAccessService);

let ownerId: string;
let granteeId: string;
let granteeEmail: string;
let strangerId: string;
let dataroomId: string;

beforeAll(async () => {
  await prisma.$connect();
  const suffix = crypto.randomUUID();
  granteeEmail = `grantee-${suffix}@example.com`;

  const [owner, grantee, stranger] = await Promise.all([
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Owner", email: `owner-${suffix}@example.com`, emailVerified: true } }),
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Grantee", email: granteeEmail, emailVerified: true } }),
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Stranger", email: `stranger-${suffix}@example.com`, emailVerified: true } }),
  ]);
  ownerId = owner.id;
  granteeId = grantee.id;
  strangerId = stranger.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, granteeId, strangerId] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  const dataroom = await dataroomsService.createDataroom(ownerId, `Share Test ${crypto.randomUUID()}`);
  dataroomId = dataroom.id;
});

afterEach(async () => {
  await prisma.dataroom.delete({ where: { id: dataroomId } });
});

describe("ownership and no-share access", () => {
  it("the owner can always view their own dataroom", async () => {
    const access = await sharesAccessService.resolveAccess("dataroom", dataroomId, ownerId, undefined);
    expect(access).toMatchObject({ allowed: true, via: "owner" });
  });

  it("a stranger with no share is denied, and assertCanView throws", async () => {
    const access = await sharesAccessService.resolveAccess("dataroom", dataroomId, strangerId, undefined);
    expect(access.allowed).toBe(false);
    await expect(sharesAccessService.assertCanView("dataroom", dataroomId, strangerId, undefined)).rejects.toThrow();
  });
});

describe("permissioned grants", () => {
  it("a dataroom-level grant reaches a deeply nested file", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Folder");
    const subfolder = await foldersService.createFolder(ownerId, dataroomId, folder.id, "Subfolder");
    const upload = await filesService.confirmFileUpload(ownerId, {
      dataroomId,
      folderId: subfolder.id,
      name: "Deep.pdf",
      size: 100,
      blobUrl: "https://example.public.blob.vercel-storage.com/deep.pdf",
      blobPathname: "deep.pdf",
    });

    await sharesService.createShare(ownerId, {
      resourceType: "dataroom",
      resourceId: dataroomId,
      mode: "permissioned",
      granteeEmails: [granteeEmail],
    });

    const access = await sharesAccessService.resolveAccess("file", upload.file.id, granteeId, undefined);
    expect(access).toMatchObject({ allowed: true, via: "share" });
  });

  it("a folder-level grant reaches nested files but not sibling folders outside the subtree", async () => {
    const folderA = await foldersService.createFolder(ownerId, dataroomId, null, "FolderA");
    const folderB = await foldersService.createFolder(ownerId, dataroomId, null, "FolderB"); // sibling, not shared
    const subfolderA = await foldersService.createFolder(ownerId, dataroomId, folderA.id, "SubA");
    const fileInA = await filesService.confirmFileUpload(ownerId, {
      dataroomId,
      folderId: subfolderA.id,
      name: "InA.pdf",
      size: 1,
      blobUrl: "https://example.public.blob.vercel-storage.com/in-a.pdf",
      blobPathname: "in-a.pdf",
    });
    const fileInB = await filesService.confirmFileUpload(ownerId, {
      dataroomId,
      folderId: folderB.id,
      name: "InB.pdf",
      size: 1,
      blobUrl: "https://example.public.blob.vercel-storage.com/in-b.pdf",
      blobPathname: "in-b.pdf",
    });

    await sharesService.createShare(ownerId, {
      resourceType: "folder",
      resourceId: folderA.id,
      mode: "permissioned",
      granteeEmails: [granteeEmail],
    });

    expect((await sharesAccessService.resolveAccess("file", fileInA.file.id, granteeId, undefined)).allowed).toBe(true);
    expect((await sharesAccessService.resolveAccess("file", fileInB.file.id, granteeId, undefined)).allowed).toBe(false);
    expect((await sharesAccessService.resolveAccess("folder", folderB.id, granteeId, undefined)).allowed).toBe(false);
  });

  it("revoking a share removes access immediately", async () => {
    const share = await sharesService.createShare(ownerId, {
      resourceType: "dataroom",
      resourceId: dataroomId,
      mode: "permissioned",
      granteeEmails: [granteeEmail],
    });
    expect((await sharesAccessService.resolveAccess("dataroom", dataroomId, granteeId, undefined)).allowed).toBe(true);

    await sharesService.revokeShare(ownerId, share.id);

    expect((await sharesAccessService.resolveAccess("dataroom", dataroomId, granteeId, undefined)).allowed).toBe(false);
  });

  it("sharing with an unregistered email is rejected", async () => {
    await expect(
      sharesService.createShare(ownerId, {
        resourceType: "dataroom",
        resourceId: dataroomId,
        mode: "permissioned",
        granteeEmails: ["nobody-registered@example.com"],
      }),
    ).rejects.toThrow();
  });

  it("a grantee cannot mutate despite having read access", async () => {
    await sharesService.createShare(ownerId, {
      resourceType: "dataroom",
      resourceId: dataroomId,
      mode: "permissioned",
      granteeEmails: [granteeEmail],
    });
    expect((await sharesAccessService.resolveAccess("dataroom", dataroomId, granteeId, undefined)).allowed).toBe(true);

    await expect(dataroomsService.renameDataroom(granteeId, dataroomId, "Hacked")).rejects.toThrow();
    await expect(foldersService.createFolder(granteeId, dataroomId, null, "Intruder")).rejects.toThrow();
  });
});

describe("public link tokens", () => {
  it("a valid token grants anonymous access; wrong or missing token is denied", async () => {
    const share = await sharesService.createShare(ownerId, {
      resourceType: "dataroom",
      resourceId: dataroomId,
      mode: "public",
    });
    expect(share.token).toBeTruthy();

    expect((await sharesAccessService.resolveAccess("dataroom", dataroomId, undefined, share.token!)).allowed).toBe(true);
    expect((await sharesAccessService.resolveAccess("dataroom", dataroomId, undefined, "not-the-real-token")).allowed).toBe(false);
    expect((await sharesAccessService.resolveAccess("dataroom", dataroomId, undefined, undefined)).allowed).toBe(false);
  });

  it("an expired token is denied", async () => {
    const share = await sharesService.createShare(ownerId, {
      resourceType: "dataroom",
      resourceId: dataroomId,
      mode: "public",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect((await sharesAccessService.resolveAccess("dataroom", dataroomId, undefined, share.token!)).allowed).toBe(false);
  });

  it("creating a public share twice for the same resource returns the same link", async () => {
    const first = await sharesService.createShare(ownerId, { resourceType: "dataroom", resourceId: dataroomId, mode: "public" });
    const second = await sharesService.createShare(ownerId, { resourceType: "dataroom", resourceId: dataroomId, mode: "public" });
    expect(second.id).toBe(first.id);
    expect(second.token).toBe(first.token);
  });
});

describe("read-path integration (getDataroomContents)", () => {
  it("serves the owner, a grantee, and a public-token viewer, but rejects a stranger", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Docs");
    const share = await sharesService.createShare(ownerId, { resourceType: "dataroom", resourceId: dataroomId, mode: "public" });

    const ownerView = await dataroomsService.getDataroomContents(ownerId, dataroomId, undefined, undefined, undefined);
    expect(ownerView.isOwner).toBe(true);
    expect(ownerView.entries.map((e) => e.id)).toContain(folder.id);

    const tokenView = await dataroomsService.getDataroomContents(undefined, dataroomId, undefined, undefined, share.token!);
    expect(tokenView.isOwner).toBe(false);
    expect(tokenView.entries.map((e) => e.id)).toContain(folder.id);

    await expect(
      dataroomsService.getDataroomContents(strangerId, dataroomId, undefined, undefined, undefined),
    ).rejects.toThrow();
  });
});
