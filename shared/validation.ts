import { z } from "zod";
import type {
  CreateFolderInput,
  ContentsQuery,
  ConfirmUploadInput,
  StarEntityInput,
  TrashQuery,
} from "./types";

const uuidSchema = z.string().uuid();
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Used for every create/rename form across dataroom, folder, and file — both as
// the backend's request-body validator and, via zodResolver, as the frontend's
// client-side form validation. Single source of truth for the "name" rule.
export const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
});

export const createFolderSchema = nameSchema.extend({
  dataroomId: uuidSchema,
  parentFolderId: uuidSchema.nullable(),
}) satisfies z.ZodType<CreateFolderInput>;

export const contentsQuerySchema = z.object({
  folderId: uuidSchema.optional(),
  search: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<ContentsQuery>;

export const confirmUploadSchema = nameSchema.extend({
  dataroomId: uuidSchema,
  folderId: uuidSchema.nullable(),
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

export type NameInput = z.infer<typeof nameSchema>;
