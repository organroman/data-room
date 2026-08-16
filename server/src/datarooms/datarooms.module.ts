import { Module } from "@nestjs/common";
import { DataroomsController } from "./datarooms.controller.js";
import { DataroomsService } from "./datarooms.service.js";
import { BlobModule } from "../blob/blob.module.js";
import { StarredModule } from "../starred/starred.module.js";

@Module({
  imports: [BlobModule, StarredModule],
  controllers: [DataroomsController],
  providers: [DataroomsService],
  exports: [DataroomsService],
})
export class DataroomsModule {}
