import { Link } from "react-router-dom";
import { TableCell, TableRow } from "@/shared/ui/table";
import { EntityIcon, ENTITY_TYPE_LABELS } from "@/shared/components/entity-icon";
import { buildEntryLink } from "@/shared/lib/entry-links";
import type { SharedWithMeEntry } from "@shared/types";

export function SharedWithMeRow({ entry }: { entry: SharedWithMeEntry }) {
  return (
    <TableRow>
      <TableCell>
        <Link
          to={buildEntryLink(entry.entityType, entry.entityId, entry.dataroomId, entry.folderId)}
          className="flex min-w-0 items-center gap-2 hover:underline"
        >
          <EntityIcon type={entry.entityType} className="size-4" />
          <span className="truncate">{entry.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">{ENTITY_TYPE_LABELS[entry.entityType]}</TableCell>
      <TableCell className="text-muted-foreground">
        {entry.entityType === "dataroom" ? "—" : entry.dataroomName}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <span className="truncate">{entry.ownerName}</span>
      </TableCell>
    </TableRow>
  );
}
