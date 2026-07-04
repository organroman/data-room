import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NameFormDialog } from "@/shared/components/name-form-dialog";
import { useCreateDataroom } from "../model/mutations";

interface CreateDataroomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDataroomDialog({ open, onOpenChange }: CreateDataroomDialogProps) {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateDataroom();

  return (
    <NameFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Data Room"
      description="Give your data room a name. You can rename it later."
      submitLabel="Create"
      pendingLabel="Creating…"
      isPending={isPending}
      onSubmit={(name) => {
        mutate(name, {
          onSuccess: (dataroom) => {
            onOpenChange(false);
            navigate(`/datarooms/${dataroom.id}`);
          },
          onError: () => toast.error("Couldn't create the data room. Please try again."),
        });
      }}
    />
  );
}
