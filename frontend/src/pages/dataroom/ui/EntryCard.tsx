import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { ActionsMenu } from "@/shared/components/actions-menu";
import { InlineRenameField } from "@/shared/components/inline-rename-field";
import { formatBytes } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useBrowseMode } from "@/shared/lib/browse-context";
import { DeleteFolderDialog } from "@/features/folder-actions";
import { DeleteFileDialog, MoveFileDialog } from "@/features/file-actions";
import { ShareDialog } from "@/features/share-actions";
import { useEntryActions } from "../model/useEntryActions";
import type { BrowserEntry } from "@shared/types";

interface EntryCardProps {
  entry: BrowserEntry;
  dataroomId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function EntryCard({ entry, dataroomId, isSelected, onToggleSelect }: EntryCardProps) {
  const { isReadOnly } = useBrowseMode();
  const {
    isFolder,
    icon: Icon,
    to,
    rename,
    del,
    move,
    share,
    renameError,
    renamePending,
    handleRenameSubmit,
    menuItems,
  } = useEntryActions(entry, dataroomId);

  return (
    <>
      <Card className={cn("group relative gap-3 py-4 transition-shadow hover:shadow-md", isSelected && "ring-2 ring-primary")}>
        {!rename.dialogOpen && <Link to={to} className="absolute inset-0" aria-label={entry.name} />}
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <span className="relative z-10">
                  <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} aria-label={`Select ${entry.name}`} />
                </span>
              )}
              <Icon className={cn("size-8 shrink-0", isFolder ? "text-muted-foreground" : "text-red-500")} />
            </div>
            <div className="relative z-10 flex items-center gap-0.5">
              {entry.starred && <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />}
              {menuItems.length > 0 && <ActionsMenu items={menuItems} />}
            </div>
          </div>
          {rename.dialogOpen ? (
            <InlineRenameField
              value={entry.name}
              isEditing
              onEditingChange={rename.setDialogOpen}
              onSubmit={handleRenameSubmit}
              isPending={renamePending}
              error={renameError}
              className="relative z-10"
            />
          ) : (
            <p className="truncate text-sm font-medium">{entry.name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {entry.type === "folder" ? "Folder" : formatBytes(entry.size)}
          </p>
        </CardContent>
      </Card>
      {entry.type === "folder" ? (
        <DeleteFolderDialog
          open={del.dialogOpen}
          onOpenChange={del.setDialogOpen}
          folderId={entry.id}
          folderName={entry.name}
        />
      ) : (
        <>
          <DeleteFileDialog
            open={del.dialogOpen}
            onOpenChange={del.setDialogOpen}
            fileId={entry.id}
            fileName={entry.name}
          />
          <MoveFileDialog
            open={move.dialogOpen}
            onOpenChange={move.setDialogOpen}
            dataroomId={dataroomId}
            fileId={entry.id}
            fileName={entry.name}
            currentFolderId={entry.folderId}
          />
        </>
      )}
      <ShareDialog
        open={share.dialogOpen}
        onOpenChange={share.setDialogOpen}
        resourceType={entry.type}
        resourceId={entry.id}
        resourceName={entry.name}
      />
    </>
  );
}
