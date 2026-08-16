import { Module } from "@nestjs/common";
import { BlobService } from "./blob.service.js";

@Module({
  providers: [BlobService],
  exports: [BlobService],
})
export class BlobModule {}
