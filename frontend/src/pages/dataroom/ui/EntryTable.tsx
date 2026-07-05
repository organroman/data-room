import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { EntryRow } from "./EntryRow";
import type { BrowserEntry } from "@shared/types";

interface EntryTableProps {
  entries: BrowserEntry[];
  dataroomId: string;
}

export function EntryTable({ entries, dataroomId }: EntryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
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
          <EntryRow key={`${entry.type}-${entry.id}`} entry={entry} dataroomId={dataroomId} />
        ))}
      </TableBody>
    </Table>
  );
}
