import { useState } from "react";
import { toast } from "sonner";
import { MAX_FILE_SIZE } from "@shared/validation";
import { formatBytes } from "@/shared/lib/format";
import { useUploadFile } from "./useUploadFile";

export interface UploadQueueItem {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  message?: string;
}

export function useUploadQueue() {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const { mutateAsync } = useUploadFile();

  function updateItem(id: string, patch: Partial<UploadQueueItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function enqueueOne(dataroomId: string, folderId: string | null, file: File) {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, name: file.name, progress: 0, status: "uploading" }]);

    // Deliberately not using mutate(vars, { onSuccess, onError }): a single shared
    // useMutation() instance stores those per-call callbacks on one observer, so
    // concurrent calls overwrite each other's callbacks and only the last-fired
    // call's handlers ever run. mutateAsync's returned promise is per-call and
    // isn't subject to that, so each upload's own outcome resolves independently.
    try {
      const { renamed, file: uploaded } = await mutateAsync({
        dataroomId,
        folderId,
        file,
        onProgress: (percentage) => updateItem(id, { progress: percentage }),
      });
      updateItem(id, {
        status: "done",
        progress: 100,
        message: renamed
          ? `Renamed to "${uploaded.name}" — a file with that name already existed here.`
          : undefined,
      });
      setTimeout(() => removeItem(id), renamed ? 6000 : 2500);
    } catch {
      updateItem(id, { status: "error", message: "Upload failed. Please try again." });
    }
  }

  function enqueueFiles(dataroomId: string, folderId: string | null, files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        toast.error(`"${file.name}" isn't a PDF and was skipped.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the ${formatBytes(MAX_FILE_SIZE)} limit.`);
        continue;
      }
      void enqueueOne(dataroomId, folderId, file);
    }
  }

  return { items, enqueueFiles, removeItem };
}
