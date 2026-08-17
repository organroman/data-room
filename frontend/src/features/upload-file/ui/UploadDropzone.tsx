import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface UploadDropzoneProps {
  onFilesDropped: (files: FileList) => void;
  className?: string;
  children: ReactNode;
}

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes("Files");
}

/**
 * Wraps the folder content area to accept OS file drags — no library needed, just the
 * native HTML5 drag-and-drop events. Calls the same enqueueFiles path as UploadButton
 * (via onFilesDropped), so both entry points share one upload queue/progress UI.
 *
 * Uses a drag-enter counter rather than checking dragleave's relatedTarget: dragenter/
 * dragleave fire on every child element boundary crossing while dragging over nested
 * content (e.g. table rows), and the counter approach ("net entries minus exits") avoids
 * the overlay flickering on/off as the pointer moves across children — a well-known rough
 * edge with the naive relatedTarget check.
 */
export function UploadDropzone({ onFilesDropped, className, children }: UploadDropzoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragCounter.current += 1;
    setIsDraggingOver(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    // Required on every dragover (not just dragenter) — the browser only fires onDrop if
    // dragover's default (navigating to the dropped file) was prevented.
    if (hasFiles(e)) e.preventDefault();
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) onFilesDropped(e.dataTransfer.files);
  }

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-background/90 backdrop-blur-sm">
          <UploadCloud className="size-8 text-primary" />
          <p className="text-sm font-medium">Drop PDF files to upload</p>
        </div>
      )}
    </div>
  );
}
