import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Folder, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { ActionsMenu } from "@/shared/components/actions-menu";
import { cn } from "@/shared/lib/utils";
import { formatBytes, formatRelativeTime } from "@/shared/lib/format";
import { useDialog } from "@/shared/hooks/use-dialog";
import {
  RenameDataroomDialog,
  DeleteDataroomDialog,
} from "@/features/dataroom-actions";
import { useStarEntity, useUnstarEntity } from "@/features/star-item";
import type { DataroomSummary } from "@shared/types";

export function DataroomCard({ dataroom }: { dataroom: DataroomSummary }) {
  const rename = useDialog();
  const del = useDialog();
  const { mutate: star } = useStarEntity();
  const { mutate: unstar } = useUnstarEntity();
  const navigate = useNavigate();

  function toggleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const action = dataroom.starred ? unstar : star;
    action(
      { entityType: "dataroom", entityId: dataroom.id },
      { onError: () => toast.error("Couldn't update starred status.") },
    );
  }

  return (
    <>
      <Card className="group relative transition-shadow hover:shadow-md">
        <Link
          to={`/datarooms/${dataroom.id}`}
          className="absolute inset-0"
          aria-label={dataroom.name}
        />
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 relative">
          <div className="flex min-w-0 flex-col gap-4">
            <Folder className="size-10 shrink-0 text-primary" />
            <span className="truncate font-medium text-lg">
              {dataroom.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 absolute top-0 right-2"
            onClick={toggleStar}
            aria-label={dataroom.starred ? "Unstar" : "Star"}
          >
            <Star
              className={cn(
                "size-4",
                dataroom.starred && "fill-yellow-400 text-yellow-400",
              )}
            />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Updated {formatRelativeTime(dataroom.updatedAt)}
          </p>
          <div className="flex items-center justify-between">
            <p className="mt-1 text-xs text-muted-foreground">
              {formatBytes(dataroom.storageBytes)} · {dataroom.folderCount}{" "}
              folders · {dataroom.fileCount} files
            </p>
            <ActionsMenu
              items={[
                {
                  label: "Open",
                  icon: ExternalLink,
                  onSelect: () => navigate(`/datarooms/${dataroom.id}`),
                },
                { label: "Rename", icon: Pencil, onSelect: rename.openDialog },
                {
                  label: "Delete",
                  icon: Trash2,
                  onSelect: del.openDialog,
                  variant: "destructive",
                },
              ]}
            />
          </div>
        </CardContent>
      </Card>
      <RenameDataroomDialog
        open={rename.dialogOpen}
        onOpenChange={rename.setDialogOpen}
        dataroomId={dataroom.id}
        currentName={dataroom.name}
      />
      <DeleteDataroomDialog
        open={del.dialogOpen}
        onOpenChange={del.setDialogOpen}
        dataroomId={dataroom.id}
        dataroomName={dataroom.name}
      />
    </>
  );
}
