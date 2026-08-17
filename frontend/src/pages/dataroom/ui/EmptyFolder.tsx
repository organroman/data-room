import { FolderOpen, FolderPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { UploadButton } from "@/features/upload-file";
import { useBrowseMode } from "@/shared/lib/browse-context";

interface EmptyFolderProps {
  onNewFolder: () => void;
  onUploadFiles: (files: FileList) => void;
}

export function EmptyFolder({ onNewFolder, onUploadFiles }: EmptyFolderProps) {
  const { isReadOnly } = useBrowseMode();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
      <FolderOpen className="size-8 text-muted-foreground" />
      <h2 className="text-lg font-medium">This folder is empty</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {isReadOnly ? "There's nothing here yet." : "Upload files or create a folder to get started."}
      </p>
      {!isReadOnly && (
        <div className="mt-2 flex items-center gap-2">
          <UploadButton onSelectFiles={onUploadFiles} />
          <Button variant="outline" onClick={onNewFolder}>
            <FolderPlus /> New Folder
          </Button>
        </div>
      )}
    </div>
  );
}
