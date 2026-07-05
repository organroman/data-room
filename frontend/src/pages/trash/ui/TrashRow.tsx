import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { EntityIcon, ENTITY_TYPE_LABELS } from "@/shared/components/entity-icon";
import { formatDateTime } from "@/shared/lib/format";
import { useRestoreTrashEntry } from "@/features/trash-actions";
import type { TrashEntry } from "@shared/types";

export function TrashRow({ entry }: { entry: TrashEntry }) {
  const { mutate, isPending } = useRestoreTrashEntry();

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
          <EntityIcon type={entry.type} className="size-4" />
          <span className="truncate">{entry.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{ENTITY_TYPE_LABELS[entry.type]}</TableCell>
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
