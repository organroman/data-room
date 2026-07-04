import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

export interface ActionsMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  variant?: "default" | "destructive";
}

interface ActionsMenuProps {
  items: ActionsMenuItem[];
  triggerClassName?: string;
}

export function ActionsMenu({ items, triggerClassName }: ActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("z-10 size-7 cursor-pointer", triggerClassName)}
          aria-label="More actions"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} variant={item.variant} onSelect={item.onSelect}>
            <item.icon className="size-4" /> {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
