export const queryKeys = {
  // Invalidating this prefix refetches both the dashboard list and every
  // dataroom's contents view — TanStack Query matches by key prefix, and
  // `dataroomContents` keys all start with "datarooms" too.
  datarooms: ["datarooms"] as const,
  dataroomContents: (dataroomId: string, folderId?: string, search?: string) =>
    ["datarooms", dataroomId, "contents", folderId ?? "root", search ?? ""] as const,
  trash: ["trash"] as const,
  starred: ["starred"] as const,
};
