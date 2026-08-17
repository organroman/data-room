import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { formatCount } from "@/shared/lib/format";
import { useDeleteFolder } from "../model/mutations";
import { useSubtreeStats } from "../model/queries";

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
}

export function DeleteFolderDialog({ open, onOpenChange, folderId, folderName }: DeleteFolderDialogProps) {
  const { mutate, isPending } = useDeleteFolder();
  const { data: stats } = useSubtreeStats(folderId, open);

  const baseMessage = "This will move the folder and everything inside it to Trash. You can restore it within 30 days.";
  const description =
    stats && (stats.folderCount > 0 || stats.fileCount > 0)
      ? `This will also move ${formatCount(stats.folderCount, "folder")} and ${formatCount(stats.fileCount, "file")} inside to Trash. You can restore it all within 30 days.`
      : baseMessage;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete "${folderName}"?`}
      description={description}
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
