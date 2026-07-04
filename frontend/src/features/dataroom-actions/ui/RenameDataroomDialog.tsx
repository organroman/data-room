import { toast } from "sonner";
import { NameFormDialog } from "@/shared/components/name-form-dialog";
import { useRenameDataroom } from "../model/mutations";

interface RenameDataroomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataroomId: string;
  currentName: string;
}

export function RenameDataroomDialog({ open, onOpenChange, dataroomId, currentName }: RenameDataroomDialogProps) {
  const { mutate, isPending } = useRenameDataroom();

  return (
    <NameFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename Data Room"
      description="Choose a new name for this data room."
      submitLabel="Save"
      pendingLabel="Saving…"
      isPending={isPending}
      defaultName={currentName}
      onSubmit={(name) => {
        mutate(
          { dataroomId, name },
          {
            onSuccess: () => onOpenChange(false),
            onError: () => toast.error("Couldn't rename the data room. Please try again."),
          },
        );
      }}
    />
  );
}
