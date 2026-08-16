import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import { isUniqueViolation } from "../common/db-errors.js";
import { serializeFileEntry } from "../common/serialize.js";
import type { FileEntry } from "../../../shared/types.js";

const NAME_CONFLICT_MESSAGE = "An item with this name already exists in this location.";
const MAX_NAME_RESOLUTION_ATTEMPTS = 5;

/**
 * A deleted file is a "trash root" when its parent folder isn't also deleted (files with
 * no folder, i.e. dataroom-root files, are always roots). Mirrors folderTrashRootWhere in
 * folders.service.ts — port of v1's fileIsTrashRoot.
 */
export function fileTrashRootWhere(
  deletedAtFilter: Prisma.FileWhereInput["deletedAt"] = { not: null },
): Prisma.FileWhereInput {
  return {
    deletedAt: deletedAtFilter,
    OR: [{ folderId: null }, { folder: { deletedAt: null } }],
  };
}

function splitExtension(name: string): { base: string; ext: string } {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex) };
}

// Port of v1's server/services/files.service.ts, scoped to a real owner throughout — see
// CLAUDE.md §4 and datarooms.service.ts's module doc comment for the Phase 2 auth model.
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blobService: BlobService,
    private readonly starredService: StarredService,
  ) {}

  /**
   * Resolves a file name to one that doesn't collide with a live sibling in the same
   * folder, auto-suffixing "(1)", "(2)", ... before the extension. Used only for uploads;
   * renames reject on collision instead.
   */
  private async resolveUniqueFileName(
    dataroomId: string,
    folderId: string | null,
    desiredName: string,
  ): Promise<{ name: string; renamed: boolean }> {
    const existing = await this.prisma.file.findMany({
      where: { dataroomId, folderId, deletedAt: null },
      select: { name: true },
    });

    const existingNames = new Set(existing.map((f) => f.name));
    if (!existingNames.has(desiredName)) {
      return { name: desiredName, renamed: false };
    }

    const { base, ext } = splitExtension(desiredName);
    let n = 1;
    let candidate = `${base} (${n})${ext}`;
    while (existingNames.has(candidate)) {
      n += 1;
      candidate = `${base} (${n})${ext}`;
    }
    return { name: candidate, renamed: true };
  }

  async confirmFileUpload(
    userId: string,
    input: {
      dataroomId: string;
      folderId: string | null;
      name: string;
      size: number;
      blobUrl: string;
      blobPathname: string;
    },
  ): Promise<{ file: FileEntry; renamed: boolean }> {
    const dataroom = await this.prisma.dataroom.findFirst({
      where: { id: input.dataroomId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!dataroom) throw ApiException.notFound("Data room");

    if (input.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: input.folderId, dataroomId: input.dataroomId, deletedAt: null },
        select: { id: true },
      });
      if (!folder) throw ApiException.notFound("Folder");
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_NAME_RESOLUTION_ATTEMPTS; attempt++) {
      const { name, renamed } = await this.resolveUniqueFileName(input.dataroomId, input.folderId, input.name);
      try {
        const row = await this.prisma.file.create({
          data: {
            dataroomId: input.dataroomId,
            folderId: input.folderId,
            name,
            size: input.size,
            blobUrl: input.blobUrl,
            blobPathname: input.blobPathname,
          },
        });
        return { file: serializeFileEntry(row, false), renamed };
      } catch (err) {
        if (isUniqueViolation(err, "files_unique_name_per_parent")) {
          lastError = err;
          continue; // another request landed the same name first; re-resolve and retry
        }
        throw err;
      }
    }
    throw lastError;
  }

  async renameFile(userId: string, fileId: string, name: string): Promise<FileEntry> {
    try {
      const result = await this.prisma.file.updateMany({
        where: { id: fileId, deletedAt: null, dataroom: { ownerId: userId } },
        data: { name, updatedAt: new Date() },
      });
      if (result.count === 0) throw ApiException.notFound("File");
      const row = await this.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
      const starredIds = await this.starredService.getStarredIds(userId, "file");
      return serializeFileEntry(row, starredIds.has(row.id));
    } catch (err) {
      if (isUniqueViolation(err, "files_unique_name_per_parent")) {
        throw ApiException.conflict(NAME_CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const now = new Date();
    const result = await this.prisma.file.updateMany({
      where: { id: fileId, deletedAt: null, dataroom: { ownerId: userId } },
      data: { deletedAt: now, updatedAt: now },
    });
    if (result.count === 0) throw ApiException.notFound("File");
  }

  async restoreFile(userId: string, fileId: string): Promise<void> {
    const result = await this.prisma.file.updateMany({
      where: { id: fileId, dataroom: { ownerId: userId } },
      data: { deletedAt: null, updatedAt: new Date() },
    });
    if (result.count === 0) throw ApiException.notFound("File");
  }

  // Internal — called only after the caller has already verified ownership.
  async purgeFilePermanently(fileId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId }, select: { blobPathname: true } });
    if (!file) return;
    await this.blobService.deleteBlobs([file.blobPathname]);
    await this.prisma.file.delete({ where: { id: fileId } });
  }

  async getFileById(userId: string, fileId: string): Promise<FileEntry> {
    const row = await this.prisma.file.findFirst({
      where: { id: fileId, deletedAt: null, dataroom: { ownerId: userId } },
    });
    if (!row) throw ApiException.notFound("File");
    const starredIds = await this.starredService.getStarredIds(userId, "file");
    return serializeFileEntry(row, starredIds.has(row.id));
  }
}
