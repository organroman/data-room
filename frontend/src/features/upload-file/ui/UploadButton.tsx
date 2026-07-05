import { useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { MAX_FILE_SIZE } from "@shared/validation";
import { formatBytes } from "@/shared/lib/format";
import { useUploadFile } from "../model/useUploadFile";

interface UploadButtonProps {
  dataroomId: string;
  folderId: string | null;
}

export function UploadButton({ dataroomId, folderId }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate } = useUploadFile();

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        toast.error(`"${file.name}" isn't a PDF and was skipped.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the ${formatBytes(MAX_FILE_SIZE)} limit.`);
        continue;
      }
      mutate(
        { dataroomId, folderId, file },
        {
          onSuccess: ({ renamed, file: uploaded }) => {
            if (renamed) {
              toast.info(`Renamed to "${uploaded.name}" — a file with that name already existed here.`);
            } else {
              toast.success(`"${uploaded.name}" uploaded`);
            }
          },
          onError: () => toast.error(`Couldn't upload "${file.name}". Please try again.`),
        },
      );
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <Upload /> Upload
      </Button>
    </>
  );
}
