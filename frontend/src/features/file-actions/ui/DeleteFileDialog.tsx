import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { useDeleteFile } from "../model/mutations";

interface DeleteFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
  /** Called after the file is successfully deleted, e.g. to navigate away from a now-gone preview. */
  onDeleted?: () => void;
}

export function DeleteFileDialog({ open, onOpenChange, fileId, fileName, onDeleted }: DeleteFileDialogProps) {
  const { mutate, isPending } = useDeleteFile();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete "${fileName}"?`}
      description="This will move the file to Trash. You can restore it within 30 days."
      confirmLabel="Delete"
      destructive
      isPending={isPending}
      onConfirm={() => {
        mutate(fileId, {
          onSuccess: () => {
            onOpenChange(false);
            toast.success(`"${fileName}" moved to Trash`);
            onDeleted?.();
          },
          onError: () => toast.error("Couldn't delete the file. Please try again."),
        });
      }}
    />
  );
}
