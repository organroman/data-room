import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Checkbox } from "@/shared/ui/checkbox";
import { useBrowseMode } from "@/shared/lib/browse-context";
import { EntryRow } from "./EntryRow";
import type { BulkSelection } from "../model/useBulkSelection";
import type { BrowserEntry } from "@shared/types";

interface EntryTableProps {
  entries: BrowserEntry[];
  dataroomId: string;
  selection: BulkSelection;
}

export function EntryTable({ entries, dataroomId, selection }: EntryTableProps) {
  const { isReadOnly } = useBrowseMode();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {!isReadOnly && (
            <TableHead className="w-8">
              <Checkbox
                checked={selection.isIndeterminate ? "indeterminate" : selection.isAllSelected}
                onCheckedChange={selection.toggleAll}
                aria-label="Select all"
              />
            </TableHead>
          )}
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Last modified</TableHead>
          <TableHead>Size</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <EntryRow
            key={`${entry.type}-${entry.id}`}
            entry={entry}
            dataroomId={dataroomId}
            isSelected={selection.isSelected(entry)}
            onToggleSelect={() => selection.toggle(entry)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
