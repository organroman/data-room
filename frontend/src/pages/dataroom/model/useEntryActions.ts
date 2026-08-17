import { useState } from "react";
import { Folder, FileText, Star, Pencil, FolderInput, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/shared/api/client";
import { useDialog } from "@/shared/hooks/use-dialog";
import { useBrowseMode } from "@/shared/lib/browse-context";
import type { ActionsMenuItem } from "@/shared/components/actions-menu";
import { useRenameFolder } from "@/features/folder-actions";
import { useRenameFile } from "@/features/file-actions";
import { useStarEntity, useUnstarEntity } from "@/features/star-item";
import type { BrowserEntry } from "@shared/types";

export function useEntryActions(entry: BrowserEntry, dataroomId: string) {
  const { isReadOnly, buildPath } = useBrowseMode();
  const rename = useDialog();
  const del = useDialog();
  const move = useDialog();
  const share = useDialog();
  const [renameError, setRenameError] = useState<string>();
  const { mutate: star } = useStarEntity();
  const { mutate: unstar } = useUnstarEntity();
  const renameFolder = useRenameFolder();
  const renameFile = useRenameFile();

  const isFolder = entry.type === "folder";
  const renamePending = isFolder ? renameFolder.isPending : renameFile.isPending;

  function handleRenameSubmit(newName: string) {
    setRenameError(undefined);
    const callbacks = {
      onSuccess: () => rename.closeDialog(),
      onError: (err: unknown) => {
        if (err instanceof ApiClientError && err.status === 409) {
          setRenameError(err.body.message);
        } else {
          toast.error("Couldn't rename. Please try again.");
        }
      },
    };
    if (isFolder) {
      renameFolder.mutate({ folderId: entry.id, name: newName }, callbacks);
    } else {
      renameFile.mutate({ fileId: entry.id, name: newName }, callbacks);
    }
  }

  function toggleStar() {
    const action = entry.starred ? unstar : star;
    action(
      { entityType: entry.type, entityId: entry.id },
      { onError: () => toast.error("Couldn't update starred status.") },
    );
  }

  const to = isFolder
    ? buildPath({ dataroomId, folderId: entry.id })
    : buildPath({ dataroomId, folderId: entry.folderId, fileId: entry.id });

  // Shared between EntryRow (table) and EntryCard (grid) — both views offer the same actions.
  // Empty in read-only mode (a shared view the viewer doesn't own) — the backend already
  // rejects these mutations for a non-owner regardless, but showing buttons that would just
  // 404 is bad UX. Starring is excluded too: it's currently owner-only server-side (Phase 2),
  // not a per-viewer personal annotation, so it isn't safe to offer to a grantee yet.
  const menuItems: ActionsMenuItem[] = isReadOnly
    ? []
    : [
        { label: entry.starred ? "Unstar" : "Star", icon: Star, onSelect: toggleStar },
        { label: "Rename", icon: Pencil, onSelect: rename.openDialog },
        { label: "Share", icon: Share2, onSelect: share.openDialog },
        ...(isFolder ? [] : [{ label: "Move to…", icon: FolderInput, onSelect: move.openDialog }]),
        { label: "Delete", icon: Trash2, onSelect: del.openDialog, variant: "destructive" as const },
      ];

  return {
    isFolder,
    icon: isFolder ? Folder : FileText,
    to,
    rename,
    del,
    move,
    share,
    isReadOnly,
    renameError,
    renamePending,
    handleRenameSubmit,
    toggleStar,
    menuItems,
  };
}
