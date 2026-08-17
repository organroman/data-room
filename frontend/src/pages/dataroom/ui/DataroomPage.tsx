import { useState } from "react";
import { Outlet, useMatch, useParams } from "react-router-dom";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorMessage } from "@/shared/components/error-message";
import { NoSearchResults } from "@/shared/components/no-search-results";
import { useDialog } from "@/shared/hooks/use-dialog";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { BrowseContextProvider, buildSharedPath, defaultBuildPath } from "@/shared/lib/browse-context";
import { useDataroomContents } from "@/features/dataroom-actions";
import { NewFolderDialog } from "@/features/folder-actions";
import { useUploadQueue, UploadProgressList, UploadDropzone } from "@/features/upload-file";
import { Breadcrumbs } from "./Breadcrumbs";
import { Toolbar } from "./Toolbar";
import { EntryTable } from "./EntryTable";
import { EntryGrid } from "./EntryGrid";
import { EmptyFolder } from "./EmptyFolder";
import type { ViewMode } from "./types";

export function DataroomPage() {
  const { dataroomId, folderId, token } = useParams<{
    dataroomId: string;
    folderId?: string;
    token?: string;
  }>();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const newFolderDialog = useDialog();
  const {
    items: uploadItems,
    enqueueFiles,
    removeItem: removeUploadItem,
  } = useUploadQueue();

  // File preview is a nested route rendered via <Outlet/>; while it's active we swap out the
  // toolbar/table for it instead of stacking both underneath. Matched against both the
  // authenticated route shape and its /shared/:token-prefixed counterpart.
  const rootFileMatch = useMatch("/datarooms/:dataroomId/files/:fileId");
  const nestedFileMatch = useMatch("/datarooms/:dataroomId/folders/:folderId/files/:fileId");
  const sharedRootFileMatch = useMatch("/shared/:token/datarooms/:dataroomId/files/:fileId");
  const sharedNestedFileMatch = useMatch("/shared/:token/datarooms/:dataroomId/folders/:folderId/files/:fileId");
  const isPreviewingFile = Boolean(rootFileMatch || nestedFileMatch || sharedRootFileMatch || sharedNestedFileMatch);

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError } = useDataroomContents(
    dataroomId!,
    folderId,
    debouncedSearch || undefined,
    token,
  );

  // Defaults to read-only (fails closed) until the fetch resolves and we actually know —
  // avoids a flash of mutating UI before isOwner is known one way or the other.
  const isReadOnly = data ? !data.isOwner : true;
  const buildPath = token ? buildSharedPath(token) : defaultBuildPath;

  function handleUploadFiles(files: FileList) {
    enqueueFiles(dataroomId!, folderId ?? null, files);
  }

  const content = (
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
  );

  return (
    <BrowseContextProvider value={{ isReadOnly, buildPath }}>
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
        ) : isReadOnly ? (
          <div className="flex flex-1 flex-col gap-4">{content}</div>
        ) : (
          <UploadDropzone onFilesDropped={handleUploadFiles} className="flex flex-1 flex-col gap-4">
            {content}
          </UploadDropzone>
        )}

        {!isReadOnly && (
          <NewFolderDialog
            open={newFolderDialog.dialogOpen}
            onOpenChange={newFolderDialog.setDialogOpen}
            dataroomId={dataroomId!}
            parentFolderId={folderId ?? null}
          />
        )}

        <UploadProgressList items={uploadItems} onDismiss={removeUploadItem} />
      </div>
    </BrowseContextProvider>
  );
}
