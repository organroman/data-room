import { useCallback, useState } from "react";
import type { BrowserEntry } from "@shared/types";

function keyOf(entry: Pick<BrowserEntry, "type" | "id">): string {
  return `${entry.type}-${entry.id}`;
}

/**
 * Multi-select state for the bulk-actions toolbar, lifted here so EntryTable/EntryGrid (and
 * their rows/cards) stay presentational. Keyed by `${type}-${id}` — same composite key already
 * used for React list keys in EntryTable/EntryGrid — since a folder and a file can't collide
 * (separate DB tables) but nothing otherwise guarantees uuid-space separation.
 */
export function useBulkSelection(entries: BrowserEntry[]) {
  const [selected, setSelected] = useState<Map<string, BrowserEntry>>(new Map());

  const clear = useCallback(() => setSelected(new Map()), []);

  const toggle = useCallback((entry: BrowserEntry) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const key = keyOf(entry);
      if (next.has(key)) next.delete(key);
      else next.set(key, entry);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (entries.length > 0 && prev.size === entries.length) return new Map();
      return new Map(entries.map((entry) => [keyOf(entry), entry]));
    });
  }, [entries]);

  const isSelected = useCallback((entry: Pick<BrowserEntry, "type" | "id">) => selected.has(keyOf(entry)), [selected]);

  const selectedEntries = Array.from(selected.values());

  return {
    selectedCount: selected.size,
    folderIds: selectedEntries.filter((e) => e.type === "folder").map((e) => e.id),
    fileIds: selectedEntries.filter((e) => e.type === "file").map((e) => e.id),
    isSelected,
    toggle,
    toggleAll,
    clear,
    isAllSelected: entries.length > 0 && selected.size === entries.length,
    isIndeterminate: selected.size > 0 && selected.size < entries.length,
  };
}

export type BulkSelection = ReturnType<typeof useBulkSelection>;
