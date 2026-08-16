import type { IncomingMessage } from "node:http";
import { Injectable } from "@nestjs/common";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";

const PDF_CONTENT_TYPE = "application/pdf";

// 1:1 port of v1's server/lib/blob.ts.
@Injectable()
export class BlobService {
  async generateUploadToken(body: HandleUploadBody, request: IncomingMessage) {
    return handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [PDF_CONTENT_TYPE],
        addRandomSuffix: true,
        maximumSizeInBytes: 100 * 1024 * 1024,
      }),
      // Vercel calls this webhook after the browser->blob upload finishes, but it requires
      // a publicly reachable URL and never fires against localhost. The DB write is instead
      // done explicitly by the client via POST /api/files/confirm right after `upload()`
      // resolves, so nothing here needs to happen for correctness.
      onUploadCompleted: async () => {},
    });
  }

  async deleteBlobs(pathnames: string[]) {
    if (pathnames.length === 0) return;
    await del(pathnames);
  }
}
