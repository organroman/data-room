import { EntryCard } from "./EntryCard";
import type { BulkSelection } from "../model/useBulkSelection";
import type { BrowserEntry } from "@shared/types";

interface EntryGridProps {
  entries: BrowserEntry[];
  dataroomId: string;
  selection: BulkSelection;
}

export function EntryGrid({ entries, dataroomId, selection }: EntryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => (
        <EntryCard
          key={`${entry.type}-${entry.id}`}
          entry={entry}
          dataroomId={dataroomId}
          isSelected={selection.isSelected(entry)}
          onToggleSelect={() => selection.toggle(entry)}
        />
      ))}
    </div>
  );
}
