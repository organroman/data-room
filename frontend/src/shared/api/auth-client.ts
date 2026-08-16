import { createAuthClient } from "better-auth/react";

// No React Context Provider needed — Better Auth's client hooks (useSession, etc.) are
// backed by a module-level store, so any component can import this shared instance
// directly. baseURL empty locally (relative, proxied — see shared/api/client.ts for why).
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || undefined,
});
