import { useMemo, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { useDialog } from "@/shared/hooks/use-dialog";
import { SearchInput } from "@/shared/components/search-input";
import { ErrorMessage } from "@/shared/components/error-message";
import { NoSearchResults } from "@/shared/components/no-search-results";
import { useDatarooms, CreateDataroomDialog } from "@/features/dataroom-actions";
import { DataroomCard } from "./DataroomCard";
import EmptyDashboard from "./EmptyDashboard";

export function DashboardPage() {
  const { data: datarooms, isLoading, isError } = useDatarooms();
  const [search, setSearch] = useState("");
  const createDialog = useDialog();

  const filtered = useMemo(() => {
    if (!datarooms) return [];
    const query = search.trim().toLowerCase();
    if (!query) return datarooms;
    return datarooms.filter((d) => d.name.toLowerCase().includes(query));
  }, [datarooms, search]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Data Rooms</h1>
          <p className="text-sm text-muted-foreground">Create and manage your data rooms</p>
        </div>
        <Button onClick={createDialog.openDialog} size="lg">
          <FolderPlus /> New Data Room
        </Button>
      </div>

      <SearchInput
        containerClassName="max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search data rooms…"
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {isError && <ErrorMessage message="Couldn't load your data rooms. Please refresh the page." />}

      {!isLoading && !isError && datarooms && datarooms.length === 0 && (
        <EmptyDashboard onOpen={createDialog.openDialog} />
      )}

      {!isLoading && !isError && datarooms && datarooms.length > 0 && filtered.length === 0 && (
        <NoSearchResults query={search} />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dataroom) => (
            <DataroomCard key={dataroom.id} dataroom={dataroom} />
          ))}
        </div>
      )}

      <CreateDataroomDialog open={createDialog.dialogOpen} onOpenChange={createDialog.setDialogOpen} />
    </div>
  );
}
