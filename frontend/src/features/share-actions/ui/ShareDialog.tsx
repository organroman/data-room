import { useState, type FormEvent } from "react";
import { Link2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ApiClientError } from "@/shared/api/client";
import { useShares } from "../model/queries";
import { useCreateShare, useRevokeGrant, useRevokeShare } from "../model/mutations";
import type { EntityType } from "@shared/types";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: EntityType;
  resourceId: string;
  resourceName: string;
}

export function ShareDialog({ open, onOpenChange, resourceType, resourceId, resourceName }: ShareDialogProps) {
  const { data: shares } = useShares(resourceType, resourceId, open);
  const createShare = useCreateShare(resourceType, resourceId);
  const revokeShare = useRevokeShare(resourceType, resourceId);
  const revokeGrant = useRevokeGrant(resourceType, resourceId);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string>();

  const publicShare = shares?.find((s) => s.mode === "public");
  const permissionedShare = shares?.find((s) => s.mode === "permissioned");

  function handleOpenChange(next: boolean) {
    if (next) {
      setEmail("");
      setInviteError(undefined);
    }
    onOpenChange(next);
  }

  function handleGenerateLink() {
    createShare.mutate(
      { resourceType, resourceId, mode: "public" },
      { onError: () => toast.error("Couldn't generate a link. Please try again.") },
    );
  }

  async function handleCopyLink() {
    if (!publicShare?.token) return;
    const url = `${window.location.origin}/shared/${publicShare.token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  function handleRevokeLink() {
    if (!publicShare) return;
    revokeShare.mutate(publicShare.id, { onError: () => toast.error("Couldn't revoke the link. Please try again.") });
  }

  function handleInvite(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviteError(undefined);
    createShare.mutate(
      { resourceType, resourceId, mode: "permissioned", granteeEmails: [trimmed] },
      {
        onSuccess: () => setEmail(""),
        onError: (err) => {
          if (err instanceof ApiClientError && err.status === 400) {
            setInviteError(err.body.message);
          } else {
            toast.error("Couldn't share with that person. Please try again.");
          }
        },
      },
    );
  }

  function handleRevokeGrant(grantId: string) {
    if (!permissionedShare) return;
    revokeGrant.mutate(
      { shareId: permissionedShare.id, grantId },
      { onError: () => toast.error("Couldn't remove access. Please try again.") },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share &quot;{resourceName}&quot;</DialogTitle>
          <DialogDescription>
            Anyone you share this with gets read-only access, including everything nested inside.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Anyone with the link</p>
              {publicShare && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeLink}
                  disabled={revokeShare.isPending}
                >
                  Revoke
                </Button>
              )}
            </div>
            {publicShare ? (
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/shared/${publicShare.token}`} className="text-xs" />
                <Button type="button" size="sm" onClick={handleCopyLink}>
                  Copy
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateLink}
                disabled={createShare.isPending}
              >
                <Link2 /> Generate link
              </Button>
            )}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Specific people</p>
            <form onSubmit={handleInvite} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="share-dialog-email" className="sr-only">
                  Email address
                </Label>
                <Input
                  id="share-dialog-email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setInviteError(undefined);
                  }}
                  aria-invalid={Boolean(inviteError)}
                />
                <Button type="submit" size="sm" disabled={createShare.isPending || !email.trim()}>
                  Invite
                </Button>
              </div>
              {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            </form>

            {permissionedShare && permissionedShare.grantees.length > 0 && (
              <ul className="space-y-1 pt-1">
                {permissionedShare.grantees.map((grantee) => (
                  <li key={grantee.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{grantee.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{grantee.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => handleRevokeGrant(grantee.id)}
                      aria-label={`Remove ${grantee.email}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
