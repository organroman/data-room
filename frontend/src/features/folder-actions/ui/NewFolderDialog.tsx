import { toast } from "sonner";
import { NameFormDialog } from "@/shared/components/name-form-dialog";
import { ApiClientError } from "@/shared/api/client";
import { useCreateFolder } from "../model/mutations";

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataroomId: string;
  parentFolderId: string | null;
}

export function NewFolderDialog({ open, onOpenChange, dataroomId, parentFolderId }: NewFolderDialogProps) {
  const { mutate, isPending } = useCreateFolder();

  return (
    <NameFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Folder"
      description="Give your folder a name."
      submitLabel="Create"
      pendingLabel="Creating…"
      isPending={isPending}
      onSubmit={(name, form) => {
        mutate(
          { dataroomId, parentFolderId, name },
          {
            onSuccess: () => onOpenChange(false),
            onError: (err) => {
              if (err instanceof ApiClientError && err.status === 409) {
                form.setError("name", { message: err.body.message });
              } else {
                toast.error("Couldn't create the folder. Please try again.");
              }
            },
          },
        );
      }}
    />
  );
}
