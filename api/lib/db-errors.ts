const POSTGRES_UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (!err || typeof err !== "object") return false;
  const pgErr = err as { code?: string; constraint?: string };
  if (pgErr.code !== POSTGRES_UNIQUE_VIOLATION) return false;
  return constraint ? pgErr.constraint === constraint : true;
}
