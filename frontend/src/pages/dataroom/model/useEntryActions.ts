import { useState } from "react";
import { Folder, FileText, Star, Pencil, FolderInput, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/shared/api/client";
import { useDialog } from "@/shared/hooks/use-dialog";
import type { ActionsMenuItem } from "@/shared/components/actions-menu";
import { useRenameFolder } from "@/features/folder-actions";
import { useRenameFile } from "@/features/file-actions";
import { useStarEntity, useUnstarEntity } from "@/features/star-item";
import type { BrowserEntry } from "@shared/types";

export function useEntryActions(entry: BrowserEntry, dataroomId: string) {
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
    ? `/datarooms/${dataroomId}/folders/${entry.id}`
    : entry.folderId
      ? `/datarooms/${dataroomId}/folders/${entry.folderId}/files/${entry.id}`
      : `/datarooms/${dataroomId}/files/${entry.id}`;

  // Shared between EntryRow (table) and EntryCard (grid) — both views offer the same actions.
  const menuItems: ActionsMenuItem[] = [
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
    renameError,
    renamePending,
    handleRenameSubmit,
    toggleStar,
    menuItems,
  };
}
