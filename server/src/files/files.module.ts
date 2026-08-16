import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { BlobModule } from "../blob/blob.module.js";
import { StarredModule } from "../starred/starred.module.js";

@Module({
  imports: [BlobModule, StarredModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
