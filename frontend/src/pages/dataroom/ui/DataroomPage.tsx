import { useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorMessage } from "@/shared/components/error-message";
import { NoSearchResults } from "@/shared/components/no-search-results";
import { useDialog } from "@/shared/hooks/use-dialog";
import { useDataroomContents } from "@/features/dataroom-actions";
import { NewFolderDialog } from "@/features/folder-actions";
import { Breadcrumbs } from "./Breadcrumbs";
import { Toolbar } from "./Toolbar";
import { EntryTable } from "./EntryTable";
import { EntryGrid } from "./EntryGrid";
import { EmptyFolder } from "./EmptyFolder";
import type { ViewMode } from "./types";

export function DataroomPage() {
  const { dataroomId, folderId } = useParams<{ dataroomId: string; folderId?: string }>();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const newFolderDialog = useDialog();

  const { data, isLoading, isError } = useDataroomContents(dataroomId!, folderId, search || undefined);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {data && (
        <Breadcrumbs dataroomId={dataroomId!} dataroomName={data.dataroom.name} folders={data.breadcrumbs} />
      )}

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
        onNewFolder={newFolderDialog.openDialog}
        dataroomId={dataroomId!}
        folderId={folderId ?? null}
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {isError && <ErrorMessage message="Couldn't load this data room. Please refresh the page." />}

      {!isLoading && !isError && data && data.entries.length === 0 && !search && (
        <EmptyFolder
          dataroomId={dataroomId!}
          folderId={folderId ?? null}
          onNewFolder={newFolderDialog.openDialog}
        />
      )}

      {!isLoading && !isError && data && data.entries.length === 0 && search && (
        <NoSearchResults query={search} />
      )}

      {!isLoading && !isError && data && data.entries.length > 0 && view === "list" && (
        <EntryTable entries={data.entries} dataroomId={dataroomId!} />
      )}

      {!isLoading && !isError && data && data.entries.length > 0 && view === "grid" && (
        <EntryGrid entries={data.entries} dataroomId={dataroomId!} />
      )}

      <NewFolderDialog
        open={newFolderDialog.dialogOpen}
        onOpenChange={newFolderDialog.setDialogOpen}
        dataroomId={dataroomId!}
        parentFolderId={folderId ?? null}
      />

      <Outlet />
    </div>
  );
}
