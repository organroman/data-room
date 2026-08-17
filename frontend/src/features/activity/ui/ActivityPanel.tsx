import { Folder, FileText, Building2, Link2, History } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/ui/sheet";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorMessage } from "@/shared/components/error-message";
import { formatRelativeTime } from "@/shared/lib/format";
import { useDataroomActivity } from "../model/queries";
import type { ActivityEntry } from "@shared/types";

interface ActivityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataroomId: string;
}

const RESOURCE_ICON = { dataroom: Building2, folder: Folder, file: FileText } as const;

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const Icon = RESOURCE_ICON[entry.resourceType];
  const resourceLabel = entry.resourceName ?? "a deleted item";
  const viewerLabel = entry.viewer ? entry.viewer.name || entry.viewer.email : "Anonymous";

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{viewerLabel}</span> viewed <span className="font-medium">{resourceLabel}</span>
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {!entry.viewer && <Link2 className="size-3" />}
          {!entry.viewer && "via public link · "}
          {formatRelativeTime(entry.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function ActivityPanel({ open, onOpenChange, dataroomId }: ActivityPanelProps) {
  const { data, isLoading, isError } = useDataroomActivity(dataroomId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Activity</SheetTitle>
          <SheetDescription>Recent views by people you've shared this data room with.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {isLoading && (
            <div className="flex flex-col gap-3 py-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-12 w-full" key={index} />
              ))}
            </div>
          )}

          {isError && <ErrorMessage message="Couldn't load activity. Please try again." className="mt-4" />}

          {!isLoading && !isError && data?.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <History className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No activity yet — nothing has been viewed via a share.</p>
            </div>
          )}

          {!isLoading && !isError && data && data.length > 0 && (
            <div className="divide-y">
              {data.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
