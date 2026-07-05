import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Download, Minus, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorMessage } from "@/shared/components/error-message";
import { ActionsMenu } from "@/shared/components/actions-menu";
import { InlineRenameField } from "@/shared/components/inline-rename-field";
import { useFile, DeleteFileDialog } from "@/features/file-actions";
import { useEntryActions } from "./useEntryActions";
import type { FileEntry } from "@shared/types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

export function FilePreviewPanel() {
  const { fileId } = useParams<{ fileId: string }>();
  const { data: file, isLoading, isError } = useFile(fileId!);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="flex-1 rounded-xl" />
      </div>
    );
  }

  if (isError || !file) {
    return <ErrorMessage message="Couldn't load this file. Please try again." />;
  }

  return <FilePreviewContent file={file} />;
}

function FilePreviewContent({ file }: { file: FileEntry }) {
  const { dataroomId } = useParams<{ dataroomId: string }>();
  const navigate = useNavigate();
  const {
    icon: Icon,
    rename,
    del,
    renameError,
    renamePending,
    handleRenameSubmit,
    toggleStar,
  } = useEntryActions(file, dataroomId!);

  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loadError, setLoadError] = useState(false);

  const backTo = file.folderId
    ? `/datarooms/${dataroomId}/folders/${file.folderId}`
    : `/datarooms/${dataroomId}`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-red-500" />
          {rename.dialogOpen ? (
            <InlineRenameField
              value={file.name}
              isEditing
              onEditingChange={rename.setDialogOpen}
              onSubmit={handleRenameSubmit}
              isPending={renamePending}
              error={renameError}
            />
          ) : (
            <span className="truncate font-medium">{file.name}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <a href={`${file.blobUrl}?download=1`} download={file.name} aria-label="Download">
              <Download className="size-4" />
            </a>
          </Button>
          <ActionsMenu
            items={[
              { label: file.starred ? "Unstar" : "Star", icon: Star, onSelect: toggleStar },
              { label: "Rename", icon: Pencil, onSelect: rename.openDialog },
              { label: "Delete", icon: Trash2, onSelect: del.openDialog, variant: "destructive" },
            ]}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => navigate(backTo)}
            aria-label="Close preview"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-auto bg-muted/30 p-6">
        {loadError ? (
          <ErrorMessage message="Couldn't render this PDF. Try downloading it instead." />
        ) : (
          <Document
            file={file.blobUrl}
            onLoadSuccess={({ numPages: total }) => {
              setNumPages(total);
              setPageNumber(1);
            }}
            onLoadError={() => setLoadError(true)}
            loading={<Skeleton className="h-150 w-115" />}
          >
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-20 text-center text-sm text-muted-foreground">
            Page {pageNumber} {numPages ? `/ ${numPages}` : ""}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setPageNumber((p) => Math.min(numPages ?? p, p + 1))}
            disabled={!numPages || pageNumber >= numPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, Number((s - SCALE_STEP).toFixed(2))))}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </Button>
          <span className="min-w-12 text-center text-sm text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, Number((s + SCALE_STEP).toFixed(2))))}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <DeleteFileDialog
        open={del.dialogOpen}
        onOpenChange={del.setDialogOpen}
        fileId={file.id}
        fileName={file.name}
        onDeleted={() => navigate(backTo)}
      />
    </div>
  );
}
