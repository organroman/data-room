import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "@/shared/api/auth-client";

/** Wraps the main app's layout route — redirects to /login when there's no session. */
export function RequireAuth() {
  const { data: session, isPending } = authClient.useSession();

  // Session check is a single fast local request; render nothing rather than a loading
  // flash that would just be replaced a moment later.
  if (isPending) return null;

  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}
