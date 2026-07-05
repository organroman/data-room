import { Link } from "react-router-dom";
import { Star, Pencil, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/shared/ui/table";
import { InlineRenameField } from "@/shared/components/inline-rename-field";
import { ActionsMenu } from "@/shared/components/actions-menu";
import { formatBytes, formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { DeleteFolderDialog } from "@/features/folder-actions";
import { DeleteFileDialog } from "@/features/file-actions";
import { useEntryActions } from "./useEntryActions";
import type { BrowserEntry } from "@shared/types";

interface EntryRowProps {
  entry: BrowserEntry;
  dataroomId: string;
}

export function EntryRow({ entry, dataroomId }: EntryRowProps) {
  const { isFolder, icon: Icon, to, rename, del, renameError, renamePending, handleRenameSubmit, toggleStar } =
    useEntryActions(entry, dataroomId);

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn("size-4 shrink-0", isFolder ? "text-muted-foreground" : "text-red-500")} />
          {rename.dialogOpen ? (
            <InlineRenameField
              value={entry.name}
              isEditing
              onEditingChange={rename.setDialogOpen}
              onSubmit={handleRenameSubmit}
              isPending={renamePending}
              error={renameError}
              className="flex-1"
            />
          ) : (
            <Link to={to} className="truncate hover:underline">
              {entry.name}
            </Link>
          )}
          {entry.starred && <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{isFolder ? "Folder" : "PDF"}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(entry.updatedAt)}</TableCell>
      <TableCell className="text-muted-foreground">
        {entry.type === "folder" ? "–" : formatBytes(entry.size)}
      </TableCell>
      <TableCell className="text-right">
        <ActionsMenu
          items={[
            { label: entry.starred ? "Unstar" : "Star", icon: Star, onSelect: toggleStar },
            { label: "Rename", icon: Pencil, onSelect: rename.openDialog },
            { label: "Delete", icon: Trash2, onSelect: del.openDialog, variant: "destructive" },
          ]}
        />
      </TableCell>
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
    </TableRow>
  );
}
