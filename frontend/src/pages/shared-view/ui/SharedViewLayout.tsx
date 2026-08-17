import { Navigate, Outlet, useMatch, useParams } from "react-router-dom";
import { Skeleton } from "@/shared/ui/skeleton";
import { buildSharedPath } from "@/shared/lib/browse-context";
import { useResolveShareToken } from "@/features/share-actions";

/**
 * Distinct, deliberately minimal chrome for an external (often not-logged-in) viewer opening
 * a due-diligence link cold — no sidebar, no dashboard navigation, just enough branding plus
 * who shared it. Not a read-only version of AppShell; a genuinely separate layout.
 *
 * Also does double duty as the token resolver: a bare /shared/:token link doesn't say which
 * route shape to render (dataroom root vs. folder vs. file), so on that exact path this
 * redirects into the fuller one — the single call to useResolveShareToken here covers both
 * "where do we redirect to" and "who do we say this was shared by", so there's exactly one
 * fetch site, not two.
 */
export function SharedViewLayout() {
  const { token } = useParams<{ token: string }>();
  const { data: resolved, isLoading, isError } = useResolveShareToken(token!);
  const isBareTokenRoute = Boolean(useMatch("/shared/:token"));

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (isError || !resolved) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">This link isn&apos;t available</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been revoked or expired. Ask the person who shared it for a new link.
        </p>
      </div>
    );
  }

  if (isBareTokenRoute) {
    const target = buildSharedPath(token!)({
      dataroomId: resolved.dataroomId,
      folderId: resolved.folderId,
      fileId: resolved.fileId ?? undefined,
    });
    return <Navigate to={target} replace />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-7 w-7" />
          <span className="font-semibold tracking-tight uppercase">Acme Corp.</span>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          Shared by <span className="font-medium text-foreground">{resolved.ownerName}</span>
        </p>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
