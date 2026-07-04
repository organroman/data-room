import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { useDeleteDataroom } from "../model/mutations";

interface DeleteDataroomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataroomId: string;
  dataroomName: string;
}

export function DeleteDataroomDialog({ open, onOpenChange, dataroomId, dataroomName }: DeleteDataroomDialogProps) {
  const { mutate, isPending } = useDeleteDataroom();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete "${dataroomName}"?`}
      description="This will move the data room and everything inside it to Trash. You can restore it within 30 days."
      confirmLabel="Delete"
      destructive
      isPending={isPending}
      onConfirm={() => {
        mutate(dataroomId, {
          onSuccess: () => {
            onOpenChange(false);
            toast.success(`"${dataroomName}" moved to Trash`);
          },
          onError: () => toast.error("Couldn't delete the data room. Please try again."),
        });
      }}
    />
  );
}
