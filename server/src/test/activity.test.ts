import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { SharesAccessService } from "../sharing/shares-access.service.js";
import { SharesService } from "../sharing/shares.service.js";
import { ActivityService } from "../activity/activity.service.js";

// New Phase 5 coverage for the owner-facing activity feed (CLAUDE.md §6b) — reads AccessLog
// rows written by SharesAccessService.assertCanView, same real-Postgres integration style as
// sharing.test.ts. Covers: a permissioned grantee's view and an anonymous public-token view
// both surface with the right viewer identity, the owner's own views are never logged (already
// covered structurally in sharing.test.ts's write path — reasserted here from the read side),
// and a non-owner can't read another owner's activity feed.

const prisma = new PrismaService();
const blobService = new BlobService();
const sharesAccessService = new SharesAccessService(prisma);
const sharesService = new SharesService(prisma);
const foldersService = new FoldersService(prisma, blobService);
const activityService = new ActivityService(prisma);

let ownerId: string;
let granteeId: string;
let granteeEmail: string;
let strangerId: string;
let dataroomId: string;

beforeAll(async () => {
  await prisma.$connect();
  const suffix = crypto.randomUUID();
  granteeEmail = `activity-grantee-${suffix}@example.com`;

  const [owner, grantee, stranger] = await Promise.all([
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Activity Owner", email: `activity-owner-${suffix}@example.com`, emailVerified: true } }),
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Activity Grantee", email: granteeEmail, emailVerified: true } }),
    prisma.user.create({ data: { id: crypto.randomUUID(), name: "Activity Stranger", email: `activity-stranger-${suffix}@example.com`, emailVerified: true } }),
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
  const dataroom = await prisma.dataroom.create({ data: { name: `Activity Test ${crypto.randomUUID()}`, ownerId } });
  dataroomId = dataroom.id;
});

afterEach(async () => {
  await prisma.dataroom.delete({ where: { id: dataroomId } });
});

describe("getDataroomActivity", () => {
  it("surfaces a permissioned grantee's view and an anonymous public-link view, most recent first", async () => {
    const folder = await foldersService.createFolder(ownerId, dataroomId, null, "Diligence");

    await sharesService.createShare(ownerId, {
      resourceType: "dataroom",
      resourceId: dataroomId,
      mode: "permissioned",
      granteeEmails: [granteeEmail],
    });
    await sharesAccessService.assertCanView("dataroom", dataroomId, granteeId, undefined);

    const folderShare = await sharesService.createShare(ownerId, {
      resourceType: "folder",
      resourceId: folder.id,
      mode: "public",
    });
    await sharesAccessService.assertCanView("folder", folder.id, undefined, folderShare.token!);

    const activity = await activityService.getDataroomActivity(ownerId, dataroomId);
    expect(activity).toHaveLength(2);

    // Most recent (the anonymous folder view) first.
    expect(activity[0]).toMatchObject({
      resourceType: "folder",
      resourceId: folder.id,
      resourceName: "Diligence",
      viewer: null,
    });
    expect(activity[1]).toMatchObject({
      resourceType: "dataroom",
      resourceId: dataroomId,
      viewer: { name: "Activity Grantee", email: granteeEmail },
    });
  });

  it("never logs the owner's own views", async () => {
    await sharesAccessService.assertCanView("dataroom", dataroomId, ownerId, undefined);
    const activity = await activityService.getDataroomActivity(ownerId, dataroomId);
    expect(activity).toHaveLength(0);
  });

  it("rejects a non-owner reading the activity feed", async () => {
    await expect(activityService.getDataroomActivity(strangerId, dataroomId)).rejects.toThrow();
  });
});
