import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/client";
import { datarooms, folders } from "../db/schema";
import { createDataroom } from "./datarooms.service";
import { createFolder, deleteFolder } from "./folders.service";
import { confirmFileUpload } from "./files.service";
import { listTrash, restoreTrashEntry } from "./trash.service";

// These are integration tests against the real local Postgres database (no
// mocking) — the behaviors under test are recursive tree operations and a
// database uniqueness constraint, neither of which a mocked db would exercise
// meaningfully. None of these tests upload real files or call the Vercel Blob
// API, so BLOB_READ_WRITE_TOKEN doesn't need to be configured to run them.

let dataroomId: string;

beforeEach(async () => {
  const dataroom = await createDataroom(`Test Dataroom ${crypto.randomUUID()}`);
  dataroomId = dataroom.id;
});

afterEach(async () => {
  // Direct hard-delete (FK cascade) instead of the service-layer purge, since
  // purge would call the real Blob API's del() for file cleanup.
  await db.delete(datarooms).where(eq(datarooms.id, dataroomId));
});

afterAll(async () => {
  await pool.end();
});

describe("recursive folder soft-delete / restore", () => {
  it("cascades delete to descendants, but Trash only lists the deleted root", async () => {
    const parent = await createFolder(dataroomId, null, "Parent");
    const child = await createFolder(dataroomId, parent.id, "Child");
    const grandchild = await createFolder(dataroomId, child.id, "Grandchild");

    await deleteFolder(parent.id);

    const trash = await listTrash(dataroomId);
    const trashIds = trash.map((entry) => entry.id);
    expect(trashIds).toContain(parent.id);
    expect(trashIds).not.toContain(child.id);
    expect(trashIds).not.toContain(grandchild.id);

    // Descendants are soft-deleted too, even though they don't get their own Trash row.
    const [childRow] = await db.select().from(folders).where(eq(folders.id, child.id));
    const [grandchildRow] = await db.select().from(folders).where(eq(folders.id, grandchild.id));
    expect(childRow.deletedAt).not.toBeNull();
    expect(grandchildRow.deletedAt).not.toBeNull();
  });

  it("restoring the root brings the whole subtree back", async () => {
    const parent = await createFolder(dataroomId, null, "Parent");
    const child = await createFolder(dataroomId, parent.id, "Child");

    await deleteFolder(parent.id);
    await restoreTrashEntry("folder", parent.id);

    const [parentRow] = await db.select().from(folders).where(eq(folders.id, parent.id));
    const [childRow] = await db.select().from(folders).where(eq(folders.id, child.id));
    expect(parentRow.deletedAt).toBeNull();
    expect(childRow.deletedAt).toBeNull();

    const trash = await listTrash(dataroomId);
    expect(trash.map((entry) => entry.id)).not.toContain(parent.id);
  });
});

describe("duplicate file name resolution on upload", () => {
  it("auto-suffixes a colliding name instead of rejecting", async () => {
    const first = await confirmFileUpload({
      dataroomId,
      folderId: null,
      name: "Summary.pdf",
      size: 1000,
      blobUrl: "https://example.public.blob.vercel-storage.com/summary-abc.pdf",
      blobPathname: "summary-abc.pdf",
    });
    expect(first.renamed).toBe(false);
    expect(first.file.name).toBe("Summary.pdf");

    const second = await confirmFileUpload({
      dataroomId,
      folderId: null,
      name: "Summary.pdf",
      size: 2000,
      blobUrl: "https://example.public.blob.vercel-storage.com/summary-def.pdf",
      blobPathname: "summary-def.pdf",
    });
    expect(second.renamed).toBe(true);
    expect(second.file.name).toBe("Summary (1).pdf");

    const third = await confirmFileUpload({
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
    const result = await confirmFileUpload({
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
