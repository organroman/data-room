import { Check, X } from "lucide-react";
import { Progress } from "@/shared/ui/progress";
import { Button } from "@/shared/ui/button";
import type { UploadQueueItem } from "../model/useUploadQueue";

interface UploadProgressListProps {
  items: UploadQueueItem[];
  onDismiss: (id: string) => void;
}

export function UploadProgressList({ items, onDismiss }: UploadProgressListProps) {
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="text-sm font-medium">
        Uploading {items.length} {items.length === 1 ? "file" : "files"}
      </p>
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">{item.name}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              {item.status === "uploading" && <span className="text-muted-foreground">{item.progress}%</span>}
              {item.status === "done" && <Check className="size-3.5 text-green-600" />}
              {item.status === "error" && <X className="size-3.5 text-destructive" />}
              <Button
                variant="ghost"
                size="icon"
                className="size-5"
                onClick={() => onDismiss(item.id)}
                aria-label="Dismiss"
              >
                <X className="size-3" />
              </Button>
            </span>
          </div>
          {item.status === "uploading" && <Progress value={item.progress} className="h-1.5" />}
          {item.message && (
            <p className={item.status === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {item.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
