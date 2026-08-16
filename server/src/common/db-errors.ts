import { Prisma } from "@prisma/client";

/**
 * Port of v1's server/lib/db-errors.ts, adapted for Prisma: a unique-constraint violation
 * surfaces as PrismaClientKnownRequestError with code "P2002" (v1 checked the raw Postgres
 * code "23505" directly against Drizzle's error object). Our partial unique indexes
 * (folders_unique_name_per_parent, files_unique_name_per_parent) are added by hand-edited
 * migration SQL rather than declared in schema.prisma (see CLAUDE.md §3), so Prisma doesn't
 * always resolve `meta.target` to a clean field-name array for them — handle both shapes.
 */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  if (!constraint) return true;

  const target = err.meta?.target;
  if (typeof target === "string") return target.includes(constraint);
  if (Array.isArray(target)) return target.some((t) => String(t).includes(constraint));
  // Constraint was requested but Prisma didn't give us a target to compare — a P2002 at
  // all is already a strong signal in a single-unique-index-per-table context.
  return true;
}
