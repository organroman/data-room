import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface InlineRenameFieldProps {
  value: string;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSubmit: (newName: string) => void;
  isPending?: boolean;
  error?: string;
  className?: string;
}

export function InlineRenameField({
  value,
  isEditing,
  onEditingChange,
  onSubmit,
  isPending = false,
  error,
  className,
}: InlineRenameFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isEditing) setDraft(value);
  }, [isEditing, value]);

  if (!isEditing) {
    return <span className={cn("truncate", className)}>{value}</span>;
  }

  function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      onEditingChange(false);
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onEditingChange(false);
            }
          }}
          disabled={isPending}
          maxLength={255}
          className="h-7 py-0"
          aria-invalid={Boolean(error)}
        />
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0"
          onClick={handleSubmit}
          disabled={isPending}
          aria-label="Confirm rename"
        >
          <Check className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0"
          onClick={() => onEditingChange(false)}
          disabled={isPending}
          aria-label="Cancel rename"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
