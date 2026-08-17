import { createContext, useContext, type ReactNode } from "react";

export interface BrowsePathParams {
  dataroomId: string;
  folderId?: string | null;
  fileId?: string;
}

/** The normal authenticated /datarooms/... route shape. */
export function defaultBuildPath({ dataroomId, folderId, fileId }: BrowsePathParams): string {
  const base = folderId ? `/datarooms/${dataroomId}/folders/${folderId}` : `/datarooms/${dataroomId}`;
  return fileId ? `${base}/files/${fileId}` : base;
}

/** The same route shape, prefixed under a public share token — for the anonymous /shared/:token viewer. */
export function buildSharedPath(token: string) {
  return ({ dataroomId, folderId, fileId }: BrowsePathParams): string => {
    const base = folderId
      ? `/shared/${token}/datarooms/${dataroomId}/folders/${folderId}`
      : `/shared/${token}/datarooms/${dataroomId}`;
    return fileId ? `${base}/files/${fileId}` : base;
  };
}

interface BrowseContextValue {
  /** True when the current viewer isn't the owner — hides mutating UI (upload, rename, move, delete, share). */
  isReadOnly: boolean;
  /** Builds the correct in-app link for a dataroom/folder/file, honoring the current browsing
   * mode (normal authenticated route vs. a public /shared/:token subtree) — components ask for
   * a link instead of string-building "/datarooms/..." themselves. */
  buildPath: (params: BrowsePathParams) => string;
}

// Defaults to read-only: any consumer rendered without a provider (shouldn't normally happen)
// fails closed rather than accidentally showing mutating UI.
const BrowseContext = createContext<BrowseContextValue>({ isReadOnly: true, buildPath: defaultBuildPath });

export function BrowseContextProvider({ value, children }: { value: BrowseContextValue; children: ReactNode }) {
  return <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>;
}

export function useBrowseMode() {
  return useContext(BrowseContext);
}
