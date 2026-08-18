import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { OptionalAuth, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { FilesService } from "./files.service.js";
import { BlobService } from "../blob/blob.service.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import {
  nameSchema,
  confirmUploadSchema,
  generateUploadTokenSchema,
  moveFileSchema,
  bulkIdsSchema,
  bulkMoveSchema,
} from "../../../shared/validation.js";
import type {
  BulkIdsInput,
  BulkMoveInput,
  ConfirmUploadInput,
  GenerateUploadTokenInput,
  MoveFileInput,
} from "../../../shared/types.js";

@Controller("files")
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly blobService: BlobService,
  ) {}

  @Post("upload-url")
  @HttpCode(HttpStatus.OK)
  async getUploadUrl(
    @Body(new ZodValidationPipe(generateUploadTokenSchema, "Invalid request body"))
    body: GenerateUploadTokenInput,
  ) {
    const token = await this.blobService.generateUploadToken(body.pathname);
    return { token };
  }

  @Post("confirm")
  async confirmUpload(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(confirmUploadSchema, "Invalid request body"))
    body: ConfirmUploadInput,
  ) {
    return this.filesService.confirmFileUpload(session.user.id, body);
  }

  @Post("bulk-delete")
  @HttpCode(204)
  async bulkDeleteFiles(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(bulkIdsSchema, "Invalid request body")) body: BulkIdsInput,
  ) {
    await this.filesService.bulkDelete(session.user.id, body.ids);
  }

  // Must be declared before PATCH ":id" below — Nest/Express matches routes in declaration
  // order, not by specificity, so a wildcard ":id" registered first would swallow the
  // literal "bulk-move" path (both are a single segment under /files).
  @Patch("bulk-move")
  bulkMoveFiles(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(bulkMoveSchema, "Invalid request body")) body: BulkMoveInput,
  ) {
    return this.filesService.bulkMove(session.user.id, body.ids, body.folderId);
  }

  @Patch(":id")
  renameFile(
    @Session() session: UserSession,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(nameSchema, "Invalid request body"))
    body: { name: string },
  ) {
    return this.filesService.renameFile(session.user.id, id, body.name);
  }

  @Patch(":id/move")
  moveFile(
    @Session() session: UserSession,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(moveFileSchema, "Invalid request body")) body: MoveFileInput,
  ) {
    return this.filesService.moveFile(session.user.id, id, body.folderId);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteFile(@Session() session: UserSession, @Param("id") id: string) {
    await this.filesService.deleteFile(session.user.id, id);
  }

  @Post(":id/restore")
  @HttpCode(204)
  async restoreFile(@Session() session: UserSession, @Param("id") id: string) {
    await this.filesService.restoreFile(session.user.id, id);
  }

  @Get(":id")
  @OptionalAuth()
  getFile(
    @Session() session: UserSession | undefined,
    @Param("id") id: string,
    @Query("token") token: string | undefined,
  ) {
    return this.filesService.getFileById(session?.user.id, id, token);
  }
}
