import { Link } from "react-router-dom";
import { Star, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { ActionsMenu } from "@/shared/components/actions-menu";
import { InlineRenameField } from "@/shared/components/inline-rename-field";
import { formatBytes } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { DeleteFolderDialog } from "@/features/folder-actions";
import { DeleteFileDialog } from "@/features/file-actions";
import { useEntryActions } from "./useEntryActions";
import type { BrowserEntry } from "@shared/types";

interface EntryCardProps {
  entry: BrowserEntry;
  dataroomId: string;
}

export function EntryCard({ entry, dataroomId }: EntryCardProps) {
  const { isFolder, icon: Icon, to, rename, del, renameError, renamePending, handleRenameSubmit, toggleStar } =
    useEntryActions(entry, dataroomId);

  return (
    <>
      <Card className="group relative gap-3 py-4 transition-shadow hover:shadow-md">
        {!rename.dialogOpen && <Link to={to} className="absolute inset-0" aria-label={entry.name} />}
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <Icon className={cn("size-8 shrink-0", isFolder ? "text-muted-foreground" : "text-red-500")} />
            <div className="relative z-10 flex items-center gap-0.5">
              {entry.starred && <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />}
              <ActionsMenu
                items={[
                  { label: entry.starred ? "Unstar" : "Star", icon: Star, onSelect: toggleStar },
                  { label: "Rename", icon: Pencil, onSelect: rename.openDialog },
                  { label: "Delete", icon: Trash2, onSelect: del.openDialog, variant: "destructive" },
                ]}
              />
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
      {isFolder ? (
        <DeleteFolderDialog
          open={del.dialogOpen}
          onOpenChange={del.setDialogOpen}
          folderId={entry.id}
          folderName={entry.name}
        />
      ) : (
        <DeleteFileDialog
          open={del.dialogOpen}
          onOpenChange={del.setDialogOpen}
          fileId={entry.id}
          fileName={entry.name}
        />
      )}
    </>
  );
}
