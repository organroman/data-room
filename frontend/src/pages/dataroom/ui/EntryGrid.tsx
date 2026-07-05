import { EntryCard } from "./EntryCard";
import type { BrowserEntry } from "@shared/types";

interface EntryGridProps {
  entries: BrowserEntry[];
  dataroomId: string;
}

export function EntryGrid({ entries, dataroomId }: EntryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => (
        <EntryCard key={`${entry.type}-${entry.id}`} entry={entry} dataroomId={dataroomId} />
      ))}
    </div>
  );
}
