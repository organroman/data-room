import { FolderPlus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { SearchInput } from "@/shared/components/search-input";
import { UploadButton } from "@/features/upload-file";
import { cn } from "@/shared/lib/utils";
import type { ViewMode } from "./types";

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onNewFolder: () => void;
  onUploadFiles: (files: FileList) => void;
}

export function Toolbar({
  search,
  onSearchChange,
  view,
  onViewChange,
  onNewFolder,
  onUploadFiles,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SearchInput
        containerClassName="max-w-sm flex-1"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search in this data room…"
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-7", view === "list" && "bg-accent")}
            onClick={() => onViewChange("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <List className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-7", view === "grid" && "bg-accent")}
            onClick={() => onViewChange("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={onNewFolder}>
          <FolderPlus /> New Folder
        </Button>
        <UploadButton onSelectFiles={onUploadFiles} />
      </div>
    </div>
  );
}
