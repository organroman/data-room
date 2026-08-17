import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { FoldersService } from "./folders.service.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { createFolderSchema, nameSchema } from "../../../shared/validation.js";
import type { CreateFolderInput } from "../../../shared/types.js";

@Controller("folders")
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  createFolder(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(createFolderSchema, "Invalid request body")) body: CreateFolderInput,
  ) {
    return this.foldersService.createFolder(session.user.id, body.dataroomId, body.parentFolderId, body.name);
  }

  @Patch(":id")
  renameFolder(
    @Session() session: UserSession,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(nameSchema, "Invalid request body")) body: { name: string },
  ) {
    return this.foldersService.renameFolder(session.user.id, id, body.name);
  }

  @Get(":id/subtree-stats")
  getSubtreeStats(@Session() session: UserSession, @Param("id") id: string) {
    return this.foldersService.getSubtreeStats(session.user.id, id);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteFolder(@Session() session: UserSession, @Param("id") id: string) {
    await this.foldersService.deleteFolder(session.user.id, id);
  }

  @Post(":id/restore")
  @HttpCode(204)
  async restoreFolder(@Session() session: UserSession, @Param("id") id: string) {
    await this.foldersService.restoreFolderById(session.user.id, id);
  }
}
