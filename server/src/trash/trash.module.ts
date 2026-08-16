import { Module } from "@nestjs/common";
import { TrashController } from "./trash.controller.js";
import { TrashService } from "./trash.service.js";
import { FoldersModule } from "../folders/folders.module.js";
import { FilesModule } from "../files/files.module.js";
import { DataroomsModule } from "../datarooms/datarooms.module.js";

@Module({
  imports: [FoldersModule, FilesModule, DataroomsModule],
  controllers: [TrashController],
  providers: [TrashService],
})
export class TrashModule {}
