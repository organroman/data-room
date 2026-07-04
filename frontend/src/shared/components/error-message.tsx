import { CircleAlert } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <p className={cn("flex items-center gap-1.5 text-sm text-destructive", className)}>
      <CircleAlert className="size-4 shrink-0" />
      {message}
    </p>
  );
}
