import type { ApiErrorBody } from "@shared/types";

// Empty locally (relative path, proxied by Vite — see vite.config.ts); the deployed
// backend's origin in production, since frontend and backend are genuinely cross-origin there.
// Exported so callers that build a backend URL outside this module's own request() — currently
// only @vercel/blob/client's upload() and its handleUploadUrl option — stay in sync with it.
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiClientError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    // Required so the session cookie is sent — same-origin in dev (harmless there) and
    // genuinely cross-origin in prod (Vercel frontend / Railway-or-Render backend).
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      body ?? { error: "unknown_error", message: `Request failed with status ${res.status}` },
    );
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function toQueryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
