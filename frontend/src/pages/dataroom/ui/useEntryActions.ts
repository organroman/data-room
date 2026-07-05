import { useState } from "react";
import { Folder, FileText } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/shared/api/client";
import { useDialog } from "@/shared/hooks/use-dialog";
import { useRenameFolder } from "@/features/folder-actions";
import { useRenameFile } from "@/features/file-actions";
import { useStarEntity, useUnstarEntity } from "@/features/star-item";
import type { BrowserEntry } from "@shared/types";

export function useEntryActions(entry: BrowserEntry, dataroomId: string) {
  const rename = useDialog();
  const del = useDialog();
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

  return {
    isFolder,
    icon: isFolder ? Folder : FileText,
    to,
    rename,
    del,
    renameError,
    renamePending,
    handleRenameSubmit,
    toggleStar,
  };
}
