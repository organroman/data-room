import { Module } from "@nestjs/common";
import { FoldersController } from "./folders.controller.js";
import { FoldersService } from "./folders.service.js";
import { BlobModule } from "../blob/blob.module.js";

@Module({
  imports: [BlobModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
