import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { formatCount } from "@/shared/lib/format";
import { useBulkDeleteFolders } from "@/features/folder-actions";
import { useBulkDeleteFiles } from "@/features/file-actions";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderIds: string[];
  fileIds: string[];
  onDeleted: () => void;
}

// Composes folder-actions' and file-actions' bulk-delete mutations, same as useEntryActions.ts
// composes single-item actions across features — FSD's downward-only imports mean this glue
// can't live inside either feature slice.
export function BulkDeleteDialog({ open, onOpenChange, folderIds, fileIds, onDeleted }: BulkDeleteDialogProps) {
  const bulkDeleteFolders = useBulkDeleteFolders();
  const bulkDeleteFiles = useBulkDeleteFiles();

  const totalCount = folderIds.length + fileIds.length;
  const isPending = bulkDeleteFolders.isPending || bulkDeleteFiles.isPending;

  const description =
    folderIds.length > 0
      ? "This will move the selected items to Trash — any folders will bring their entire contents with them. You can restore everything within 30 days."
      : "This will move the selected files to Trash. You can restore them within 30 days.";

  async function handleConfirm() {
    try {
      await Promise.all([
        folderIds.length > 0 ? bulkDeleteFolders.mutateAsync(folderIds) : Promise.resolve(),
        fileIds.length > 0 ? bulkDeleteFiles.mutateAsync(fileIds) : Promise.resolve(),
      ]);
      onOpenChange(false);
      onDeleted();
      toast.success(`Moved ${formatCount(totalCount, "item")} to Trash`);
    } catch {
      toast.error("Couldn't delete everything selected. Please try again.");
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${formatCount(totalCount, "item")}?`}
      description={description}
      confirmLabel="Delete"
      destructive
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
