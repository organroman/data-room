import { Star } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ErrorMessage } from "@/shared/components/error-message";
import { useStarred } from "@/features/star-item";
import { StarredRow } from "./StarredRow";

export function StarredPage() {
  const { data: entries, isLoading, isError } = useStarred();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Starred</h1>
        <p className="text-sm text-muted-foreground">Data rooms, folders, and files you've starred.</p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorMessage message="Couldn't load starred items. Please refresh the page." />}

      {!isLoading && !isError && entries && entries.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
          <Star className="size-8 text-muted-foreground" />
          <h2 className="text-lg font-medium">Nothing starred yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Star a data room, folder, or file to find it here quickly.
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
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <StarredRow key={`${entry.entityType}-${entry.entityId}`} entry={entry} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
