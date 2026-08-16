import { Module } from "@nestjs/common";
import { StarredController } from "./starred.controller.js";
import { StarredService } from "./starred.service.js";

@Module({
  controllers: [StarredController],
  providers: [StarredService],
  exports: [StarredService],
})
export class StarredModule {}
