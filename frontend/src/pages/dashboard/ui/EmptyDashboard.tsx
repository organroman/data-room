import { FolderPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface EmptyDashboardProps {
  onOpen: () => void;
}

const EmptyDashboard = ({ onOpen }: EmptyDashboardProps) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
      <FolderPlus className="size-8 text-muted-foreground" />
      <h2 className="text-lg font-medium">No data rooms yet</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Create your first data room to start organizing and sharing documents.
      </p>
      <Button className="mt-2" onClick={onOpen}>
        <FolderPlus /> New Data Room
      </Button>
    </div>
  );
};

export default EmptyDashboard;
