import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { EntityIcon, ENTITY_TYPE_LABELS } from "@/shared/components/entity-icon";
import { useUnstarEntity } from "@/features/star-item";
import type { StarredEntry } from "@shared/types";

function buildLink(entry: StarredEntry): string {
  if (entry.entityType === "dataroom") return `/datarooms/${entry.entityId}`;
  if (entry.entityType === "folder") return `/datarooms/${entry.dataroomId}/folders/${entry.entityId}`;
  return entry.folderId
    ? `/datarooms/${entry.dataroomId}/folders/${entry.folderId}/files/${entry.entityId}`
    : `/datarooms/${entry.dataroomId}/files/${entry.entityId}`;
}

export function StarredRow({ entry }: { entry: StarredEntry }) {
  const { mutate, isPending } = useUnstarEntity();

  function handleUnstar() {
    mutate(
      { entityType: entry.entityType, entityId: entry.entityId },
      { onError: () => toast.error("Couldn't update starred status.") },
    );
  }

  return (
    <TableRow>
      <TableCell>
        <Link to={buildLink(entry)} className="flex min-w-0 items-center gap-2 hover:underline">
          <EntityIcon type={entry.entityType} className="size-4" />
          <span className="truncate">{entry.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">{ENTITY_TYPE_LABELS[entry.entityType]}</TableCell>
      <TableCell className="text-muted-foreground">
        {entry.entityType === "dataroom" ? "—" : entry.dataroomName}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" className="size-8" onClick={handleUnstar} disabled={isPending}>
          <Star className="size-4 fill-yellow-400 text-yellow-400" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
