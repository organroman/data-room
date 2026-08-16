import { Module } from "@nestjs/common";
import { SharingController } from "./sharing.controller.js";
import { SharesService } from "./shares.service.js";
import { SharesAccessService } from "./shares-access.service.js";

@Module({
  controllers: [SharingController],
  providers: [SharesService, SharesAccessService],
  exports: [SharesAccessService],
})
export class SharingModule {}
