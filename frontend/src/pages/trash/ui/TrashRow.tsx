import { Building2, Folder, FileText, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import { useRestoreTrashEntry } from "@/features/trash-actions";
import type { TrashEntry } from "@shared/types";

const ICONS = { dataroom: Building2, folder: Folder, file: FileText } as const;
const LABELS = { dataroom: "Data Room", folder: "Folder", file: "File" } as const;

export function TrashRow({ entry }: { entry: TrashEntry }) {
  const { mutate, isPending } = useRestoreTrashEntry();
  const Icon = ICONS[entry.type];

  function handleRestore() {
    mutate(
      { type: entry.type, id: entry.id },
      {
        onSuccess: () => toast.success(`"${entry.name}" restored`),
        onError: () => toast.error("Couldn't restore this item. Please try again."),
      },
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            className={
              "size-4 shrink-0 " +
              (entry.type === "file" ? "text-red-500" : "text-muted-foreground")
            }
          />
          <span className="truncate">{entry.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{LABELS[entry.type]}</TableCell>
      <TableCell className="text-muted-foreground">
        {entry.type === "dataroom" ? "—" : entry.dataroomName}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(entry.deletedAt)}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={handleRestore} disabled={isPending}>
          <Undo2 className="size-4" /> Restore
        </Button>
      </TableCell>
    </TableRow>
  );
}
