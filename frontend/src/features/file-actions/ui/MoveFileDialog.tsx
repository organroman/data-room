import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { ApiClientError } from "@/shared/api/client";
import { FolderTreePicker } from "./FolderTreePicker";
import { useMoveFile } from "../model/mutations";

interface MoveFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataroomId: string;
  fileId: string;
  fileName: string;
  currentFolderId: string | null;
}

export function MoveFileDialog({
  open,
  onOpenChange,
  dataroomId,
  fileId,
  fileName,
  currentFolderId,
}: MoveFileDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [moveError, setMoveError] = useState<string>();
  const { mutate, isPending } = useMoveFile();

  function handleOpenChange(next: boolean) {
    if (next) {
      setSelectedFolderId(currentFolderId);
      setMoveError(undefined);
    }
    onOpenChange(next);
  }

  function handleMove() {
    setMoveError(undefined);
    mutate(
      { fileId, folderId: selectedFolderId },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          // A 409 (name collision in the destination) is shown inline so the user can pick a
          // different folder without losing their place — matches how rename conflicts are
          // surfaced (useEntryActions.handleRenameSubmit), rather than a toast that disappears
          // once the dialog would otherwise look like nothing happened. See discussion in the
          // conversation: move is a single, watched action, so it hard-rejects like rename
          // instead of auto-suffixing like upload.
          if (err instanceof ApiClientError && err.status === 409) {
            setMoveError(err.body.message);
          } else {
            toast.error("Couldn't move the file. Please try again.");
          }
        },
      },
    );
  }

  const isSameLocation = selectedFolderId === currentFolderId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move &quot;{fileName}&quot;</DialogTitle>
          <DialogDescription>Choose a destination folder.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <FolderTreePicker
            dataroomId={dataroomId}
            selectedFolderId={selectedFolderId}
            onSelect={(folderId) => {
              setMoveError(undefined);
              setSelectedFolderId(folderId);
            }}
          />
          {moveError && <p className="text-sm text-destructive">{moveError}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={isPending || isSameLocation}>
            {isPending ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
