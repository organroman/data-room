import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { useDeleteFolder } from "../model/mutations";

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
}

export function DeleteFolderDialog({ open, onOpenChange, folderId, folderName }: DeleteFolderDialogProps) {
  const { mutate, isPending } = useDeleteFolder();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete "${folderName}"?`}
      description="This will move the folder and everything inside it to Trash. You can restore it within 30 days."
      confirmLabel="Delete"
      destructive
      isPending={isPending}
      onConfirm={() => {
        mutate(folderId, {
          onSuccess: () => {
            onOpenChange(false);
            toast.success(`"${folderName}" moved to Trash`);
          },
          onError: () => toast.error("Couldn't delete the folder. Please try again."),
        });
      }}
    />
  );
}
