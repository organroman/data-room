import { useState } from "react";
import { Outlet, useMatch, useParams } from "react-router-dom";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorMessage } from "@/shared/components/error-message";
import { NoSearchResults } from "@/shared/components/no-search-results";
import { useDialog } from "@/shared/hooks/use-dialog";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useDataroomContents } from "@/features/dataroom-actions";
import { NewFolderDialog } from "@/features/folder-actions";
import { useUploadQueue, UploadProgressList } from "@/features/upload-file";
import { Breadcrumbs } from "./Breadcrumbs";
import { Toolbar } from "./Toolbar";
import { EntryTable } from "./EntryTable";
import { EntryGrid } from "./EntryGrid";
import { EmptyFolder } from "./EmptyFolder";
import type { ViewMode } from "./types";

export function DataroomPage() {
  const { dataroomId, folderId } = useParams<{
    dataroomId: string;
    folderId?: string;
  }>();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const newFolderDialog = useDialog();
  const {
    items: uploadItems,
    enqueueFiles,
    removeItem: removeUploadItem,
  } = useUploadQueue();

  // File preview is a nested route rendered via <Outlet/>; while it's active we
  // swap out the toolbar/table for it instead of stacking both underneath.
  const rootFileMatch = useMatch("/datarooms/:dataroomId/files/:fileId");
  const nestedFileMatch = useMatch("/datarooms/:dataroomId/folders/:folderId/files/:fileId");
  const isPreviewingFile = Boolean(rootFileMatch || nestedFileMatch);

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError } = useDataroomContents(
    dataroomId!,
    folderId,
    debouncedSearch || undefined,
  );

  function handleUploadFiles(files: FileList) {
    enqueueFiles(dataroomId!, folderId ?? null, files);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {data && (
        <Breadcrumbs
          dataroomId={dataroomId!}
          dataroomName={data.dataroom.name}
          folders={data.breadcrumbs}
        />
      )}

      {isPreviewingFile ? (
        <Outlet />
      ) : (
        <>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            view={view}
            onViewChange={setView}
            onNewFolder={newFolderDialog.openDialog}
            onUploadFiles={handleUploadFiles}
          />

          {isLoading && (
            <div className="flex w-full flex-col gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="flex gap-4" key={index}>
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <ErrorMessage message="Couldn't load this data room. Please refresh the page." />
          )}

          {!isLoading &&
            !isError &&
            data &&
            data.entries.length === 0 &&
            !debouncedSearch && (
              <EmptyFolder
                onNewFolder={newFolderDialog.openDialog}
                onUploadFiles={handleUploadFiles}
              />
            )}

          {!isLoading &&
            !isError &&
            data &&
            data.entries.length === 0 &&
            debouncedSearch && <NoSearchResults query={debouncedSearch} />}

          {!isLoading &&
            !isError &&
            data &&
            data.entries.length > 0 &&
            view === "list" && (
              <EntryTable entries={data.entries} dataroomId={dataroomId!} />
            )}

          {!isLoading &&
            !isError &&
            data &&
            data.entries.length > 0 &&
            view === "grid" && (
              <EntryGrid entries={data.entries} dataroomId={dataroomId!} />
            )}
        </>
      )}

      <NewFolderDialog
        open={newFolderDialog.dialogOpen}
        onOpenChange={newFolderDialog.setDialogOpen}
        dataroomId={dataroomId!}
        parentFolderId={folderId ?? null}
      />

      <UploadProgressList items={uploadItems} onDismiss={removeUploadItem} />
    </div>
  );
}
