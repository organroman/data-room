import { useState } from "react";
import { ChevronRight, Folder, FolderClosed } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useSubfolders } from "../model/queries";
import type { FolderEntry } from "@shared/types";

interface FolderTreePickerProps {
  dataroomId: string;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

interface FolderNodeProps {
  dataroomId: string;
  folder: FolderEntry;
  depth: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
}

function FolderRow({
  label,
  icon: Icon,
  depth,
  selected,
  expanded,
  onToggleExpand,
  onSelect,
}: {
  label: string;
  icon: typeof Folder;
  depth: number;
  selected: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md py-1.5 pr-2 text-sm hover:bg-accent",
        selected && "bg-accent font-medium",
      )}
      style={{ paddingLeft: `${depth * 1.25 + 0.25}rem` }}
      onClick={onSelect}
    >
      {onToggleExpand ? (
        <button
          type="button"
          className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted-foreground/10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function FolderNode({ dataroomId, folder, depth, selectedFolderId, onSelect }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: children, isLoading } = useSubfolders(dataroomId, folder.id, expanded);

  return (
    <div>
      <FolderRow
        label={folder.name}
        icon={Folder}
        depth={depth}
        selected={selectedFolderId === folder.id}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        onSelect={() => onSelect(folder.id)}
      />
      {expanded && (
        <div>
          {isLoading && (
            <p className="py-1 text-xs text-muted-foreground" style={{ paddingLeft: `${(depth + 1) * 1.25 + 1.75}rem` }}>
              Loading…
            </p>
          )}
          {!isLoading && children?.length === 0 && (
            <p className="py-1 text-xs text-muted-foreground" style={{ paddingLeft: `${(depth + 1) * 1.25 + 1.75}rem` }}>
              No subfolders
            </p>
          )}
          {children?.map((child) => (
            <FolderNode
              key={child.id}
              dataroomId={dataroomId}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Navigable, lazily-expanded folder tree for a data room — used by MoveFileDialog to pick a destination. */
export function FolderTreePicker({ dataroomId, selectedFolderId, onSelect }: FolderTreePickerProps) {
  const { data: rootFolders, isLoading } = useSubfolders(dataroomId, undefined, true);

  return (
    <div role="listbox" aria-label="Destination folder" className="max-h-64 overflow-y-auto rounded-md border p-1">
      <FolderRow
        label="Data Room root"
        icon={FolderClosed}
        depth={0}
        selected={selectedFolderId === null}
        onSelect={() => onSelect(null)}
      />
      {isLoading && <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>}
      {rootFolders?.map((folder) => (
        <FolderNode
          key={folder.id}
          dataroomId={dataroomId}
          folder={folder}
          depth={1}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
