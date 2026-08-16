import { z } from "zod";
import type {
  CreateFolderInput,
  ContentsQuery,
  ConfirmUploadInput,
  StarEntityInput,
  TrashQuery,
  CreateShareInput,
  SharesQuery,
} from "./types.js";

const uuidSchema = z.string().uuid();
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

const entityTypeSchema = z.enum(["dataroom", "folder", "file"]);

export const createShareSchema = z
  .object({
    resourceType: entityTypeSchema,
    resourceId: uuidSchema,
    mode: z.enum(["public", "permissioned"]),
    expiresAt: z.string().datetime().nullable().optional(),
    granteeEmails: z.array(z.string().trim().email()).max(25).optional(),
  })
  .refine((v) => v.mode !== "permissioned" || (v.granteeEmails?.length ?? 0) > 0, {
    message: "At least one email is required to share with specific people",
    path: ["granteeEmails"],
  }) satisfies z.ZodType<CreateShareInput>;

export const sharesQuerySchema = z.object({
  resourceType: entityTypeSchema,
  resourceId: uuidSchema,
}) satisfies z.ZodType<SharesQuery>;

export type NameInput = z.infer<typeof nameSchema>;

// Not paired with a backend DTO via `satisfies` like the schemas above — these forms post
// directly to Better Auth's own /sign-in/email and /sign-up/email endpoints (server/src/auth),
// which validate independently server-side. This is purely for client-side form UX, kept here
// for consistency with the rest of the app's react-hook-form + zodResolver pattern.
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().trim().email("Enter a valid email address"),
  // Mirrors Better Auth's own emailAndPassword.minPasswordLength default (server/src/auth/auth.ts).
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
