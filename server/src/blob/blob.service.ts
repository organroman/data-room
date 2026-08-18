import { Injectable } from "@nestjs/common";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { del } from "@vercel/blob";

const PDF_CONTENT_TYPE = "application/pdf";

// 1:1 port of v1's server/lib/blob.ts, except for the token-generation flow — see
// generateUploadToken's own comment for why it diverges from Vercel Blob's usual
// handleUpload()-based pattern.
@Injectable()
export class BlobService {
  /**
   * Generates a short-lived client token the browser uses to PUT a file straight to Blob
   * storage (bypassing our server for the file bytes themselves). Deliberately does NOT use
   * @vercel/blob/client's handleUpload() convenience wrapper: that expects the *browser* to
   * call an unauthenticated callback route directly via its own internal fetch(), which has no
   * option to set `credentials: "include"` — fine same-origin, but this app's frontend and
   * backend are on different origins in production, so that internal fetch would never carry
   * the session cookie and Nest's AuthGuard would reject it with 401. Calling this method from
   * a normal `@Post()` route means the *browser's own* authenticated request (via
   * shared/api/client.ts, which does set credentials: "include") is what reaches here instead.
   *
   * onUploadCompleted is intentionally omitted (optional on this lower-level function, unlike
   * handleUpload's required one) — same reasoning as before: it requires a publicly reachable
   * webhook URL and this app already does the DB write explicitly via POST /files/confirm
   * right after the browser's PUT resolves, so nothing needs to happen server-to-server here.
   */
  async generateUploadToken(pathname: string): Promise<string> {
    return generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: [PDF_CONTENT_TYPE],
      addRandomSuffix: true,
      maximumSizeInBytes: 100 * 1024 * 1024,
    });
  }

  async deleteBlobs(pathnames: string[]) {
    if (pathnames.length === 0) return;
    await del(pathnames);
  }
}
