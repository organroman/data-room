import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { TableCell, TableRow } from "@/shared/ui/table";
import { InlineRenameField } from "@/shared/components/inline-rename-field";
import { ActionsMenu } from "@/shared/components/actions-menu";
import { formatBytes, formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { DeleteFolderDialog } from "@/features/folder-actions";
import { DeleteFileDialog, MoveFileDialog } from "@/features/file-actions";
import { useEntryActions } from "../model/useEntryActions";
import type { BrowserEntry } from "@shared/types";

interface EntryRowProps {
  entry: BrowserEntry;
  dataroomId: string;
}

export function EntryRow({ entry, dataroomId }: EntryRowProps) {
  const {
    isFolder,
    icon: Icon,
    to,
    rename,
    del,
    move,
    renameError,
    renamePending,
    handleRenameSubmit,
    menuItems,
  } = useEntryActions(entry, dataroomId);

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
        <ActionsMenu items={menuItems} />
      </TableCell>
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
    </TableRow>
  );
}
