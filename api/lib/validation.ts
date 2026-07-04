import { z } from "zod";
import type {
  CreateDataroomInput,
  RenameInput,
  CreateFolderInput,
  ContentsQuery,
  ConfirmUploadInput,
  StarEntityInput,
  TrashQuery,
} from "@shared/types";

const uuidSchema = z.string().uuid();
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const createDataroomSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
}) satisfies z.ZodType<CreateDataroomInput>;

export const renameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
}) satisfies z.ZodType<RenameInput>;

export const createFolderSchema = z.object({
  dataroomId: uuidSchema,
  parentFolderId: uuidSchema.nullable(),
  name: z.string().trim().min(1, "Name is required").max(255),
}) satisfies z.ZodType<CreateFolderInput>;

export const contentsQuerySchema = z.object({
  folderId: uuidSchema.optional(),
  search: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<ContentsQuery>;

export const confirmUploadSchema = z.object({
  dataroomId: uuidSchema,
  folderId: uuidSchema.nullable(),
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(MAX_FILE_SIZE, "File exceeds the 100MB limit"),
  blobUrl: z.string().url(),
  blobPathname: z.string().min(1),
}) satisfies z.ZodType<ConfirmUploadInput>;

export const starEntitySchema = z.object({
  entityType: z.enum(["dataroom", "folder", "file"]),
  entityId: uuidSchema,
}) satisfies z.ZodType<StarEntityInput>;

export const trashQuerySchema = z.object({
  dataroomId: uuidSchema.optional(),
}) satisfies z.ZodType<TrashQuery>;
