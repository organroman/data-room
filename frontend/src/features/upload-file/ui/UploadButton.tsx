import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface UploadButtonProps {
  onSelectFiles: (files: FileList) => void;
}

export function UploadButton({ onSelectFiles }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onSelectFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <Upload /> Upload
      </Button>
    </>
  );
}
