import { Building2, Folder, FileText } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { EntityType } from "@shared/types";

const ICONS = { dataroom: Building2, folder: Folder, file: FileText } as const;

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  dataroom: "Data Room",
  folder: "Folder",
  file: "File",
};

interface EntityIconProps {
  type: EntityType;
  className?: string;
}

export function EntityIcon({ type, className }: EntityIconProps) {
  const Icon = ICONS[type];
  return <Icon className={cn("shrink-0", type === "file" ? "text-red-500" : "text-muted-foreground", className)} />;
}
