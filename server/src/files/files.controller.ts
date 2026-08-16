import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import type { HandleUploadBody } from "@vercel/blob/client";
import { OptionalAuth, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { FilesService } from "./files.service.js";
import { BlobService } from "../blob/blob.service.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { nameSchema, confirmUploadSchema, moveFileSchema } from "../../../shared/validation.js";
import type { ConfirmUploadInput, MoveFileInput } from "../../../shared/types.js";

@Controller("files")
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly blobService: BlobService,
  ) {}

  @Post("upload-url")
  @HttpCode(HttpStatus.OK)
  // Body shape here is dictated by @vercel/blob's client `upload()` helper, not our own
  // schema, so it isn't zod-validated like the rest of the API's request bodies.
  getUploadUrl(@Body() body: HandleUploadBody, @Req() req: Request) {
    return this.blobService.generateUploadToken(body, req);
  }

  @Post("confirm")
  async confirmUpload(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(confirmUploadSchema, "Invalid request body"))
    body: ConfirmUploadInput,
  ) {
    return this.filesService.confirmFileUpload(session.user.id, body);
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
