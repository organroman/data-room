import type { IncomingMessage } from "node:http";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";

const PDF_CONTENT_TYPE = "application/pdf";

export async function generateUploadToken(body: HandleUploadBody, request: IncomingMessage) {
  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [PDF_CONTENT_TYPE],
      addRandomSuffix: true,
      maximumSizeInBytes: 100 * 1024 * 1024,
    }),
    // Vercel calls this webhook after the browser->blob upload finishes, but it
    // requires a publicly reachable URL and never fires against localhost. The
    // DB write is instead done explicitly by the client via POST /api/files/confirm
    // right after `upload()` resolves, so nothing here needs to happen for
    // correctness — this is only a best-effort log hook in environments where
    // the webhook can reach us.
    onUploadCompleted: async () => {},
  });
}

export async function deleteBlobs(pathnames: string[]) {
  if (pathnames.length === 0) return;
  await del(pathnames);
}
