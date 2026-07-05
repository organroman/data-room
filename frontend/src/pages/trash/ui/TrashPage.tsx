import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ErrorMessage } from "@/shared/components/error-message";
import { useDialog } from "@/shared/hooks/use-dialog";
import { useTrash, EmptyTrashDialog } from "@/features/trash-actions";
import { TrashRow } from "./TrashRow";

export function TrashPage() {
  const { data: entries, isLoading, isError } = useTrash();
  const emptyTrashDialog = useDialog();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Items in trash will be permanently deleted after 30 days.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={emptyTrashDialog.openDialog}
          disabled={!entries || entries.length === 0}
        >
          <Trash2 /> Empty Trash
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorMessage message="Couldn't load Trash. Please refresh the page." />}

      {!isLoading && !isError && entries && entries.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
          <Trash2 className="size-8 text-muted-foreground" />
          <h2 className="text-lg font-medium">Trash is empty</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Deleted data rooms, folders, and files will show up here for 30 days before being
            permanently removed.
          </p>
        </div>
      )}

      {!isLoading && !isError && entries && entries.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Data Room</TableHead>
              <TableHead>Deleted on</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TrashRow key={`${entry.type}-${entry.id}`} entry={entry} />
            ))}
          </TableBody>
        </Table>
      )}

      <EmptyTrashDialog open={emptyTrashDialog.dialogOpen} onOpenChange={emptyTrashDialog.setDialogOpen} />
    </div>
  );
}
