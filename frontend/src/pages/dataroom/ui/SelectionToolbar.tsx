import { FolderInput, Trash2, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { formatCount } from "@/shared/lib/format";

interface SelectionToolbarProps {
  selectedCount: number;
  canMove: boolean;
  onMove: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function SelectionToolbar({ selectedCount, canMove, onMove, onDelete, onClear }: SelectionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-7" onClick={onClear} aria-label="Clear selection">
          <X className="size-4" />
        </Button>
        <span className="text-sm font-medium">{formatCount(selectedCount, "item")} selected</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onMove}
          disabled={!canMove}
          title={canMove ? undefined : "Only files can be moved in bulk — deselect any folders to enable this."}
        >
          <FolderInput /> Move to…
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 /> Delete
        </Button>
      </div>
    </div>
  );
}
