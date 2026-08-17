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
import { formatCount } from "@/shared/lib/format";
import { FolderTreePicker } from "./FolderTreePicker";
import { useBulkMoveFiles } from "../model/mutations";

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataroomId: string;
  fileIds: string[];
  onMoved: () => void;
}

export function BulkMoveDialog({ open, onOpenChange, dataroomId, fileIds, onMoved }: BulkMoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { mutate, isPending } = useBulkMoveFiles();

  function handleOpenChange(next: boolean) {
    if (next) setSelectedFolderId(null);
    onOpenChange(next);
  }

  function handleMove() {
    mutate(
      { ids: fileIds, folderId: selectedFolderId },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          onMoved();
          if (result.conflictCount > 0) {
            // Best-effort, not all-or-nothing — see files.service.ts's bulkMove doc comment.
            // Conflicting files are left in place (hard-reject, same as single-file move), not
            // silently renamed, so the toast tells the user some items need a manual decision.
            toast.warning(
              `Moved ${formatCount(result.movedCount, "file")}. ${result.conflictCount} skipped due to a name conflict in the destination.`,
            );
          } else {
            toast.success(`Moved ${formatCount(result.movedCount, "file")}.`);
          }
        },
        onError: () => toast.error("Couldn't move the files. Please try again."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {formatCount(fileIds.length, "file")}</DialogTitle>
          <DialogDescription>Choose a destination folder.</DialogDescription>
        </DialogHeader>
        <FolderTreePicker dataroomId={dataroomId} selectedFolderId={selectedFolderId} onSelect={setSelectedFolderId} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={isPending}>
            {isPending ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
