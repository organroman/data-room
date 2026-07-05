import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { useEmptyTrash } from "../model/mutations";

interface EmptyTrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmptyTrashDialog({ open, onOpenChange }: EmptyTrashDialogProps) {
  const { mutate, isPending } = useEmptyTrash();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Empty Trash?"
      description="This will permanently delete everything in Trash. This action cannot be undone."
      confirmLabel="Empty Trash"
      destructive
      isPending={isPending}
      onConfirm={() => {
        mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false);
            toast.success("Trash emptied");
          },
          onError: () => toast.error("Couldn't empty Trash. Please try again."),
        });
      }}
    />
  );
}
