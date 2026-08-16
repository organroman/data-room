import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { OptionalAuth, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { DataroomsService } from "./datarooms.service.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { nameSchema, contentsQuerySchema } from "../../../shared/validation.js";
import type { ContentsQuery } from "../../../shared/types.js";

@Controller("datarooms")
export class DataroomsController {
  constructor(private readonly dataroomsService: DataroomsService) {}

  @Get()
  listDatarooms(@Session() session: UserSession) {
    return this.dataroomsService.listDatarooms(session.user.id);
  }

  @Post()
  createDataroom(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(nameSchema, "Invalid request body")) body: { name: string },
  ) {
    return this.dataroomsService.createDataroom(session.user.id, body.name);
  }

  @Patch(":id")
  renameDataroom(
    @Session() session: UserSession,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(nameSchema, "Invalid request body")) body: { name: string },
  ) {
    return this.dataroomsService.renameDataroom(session.user.id, id, body.name);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteDataroom(@Session() session: UserSession, @Param("id") id: string) {
    await this.dataroomsService.deleteDataroom(session.user.id, id);
  }

  @Post(":id/restore")
  @HttpCode(204)
  async restoreDataroom(@Session() session: UserSession, @Param("id") id: string) {
    await this.dataroomsService.restoreDataroomById(session.user.id, id);
  }

  @Get(":id/contents")
  @OptionalAuth()
  getDataroomContents(
    @Session() session: UserSession | undefined,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(contentsQuerySchema, "Invalid query parameters")) query: ContentsQuery,
    @Query("token") token: string | undefined,
  ) {
    return this.dataroomsService.getDataroomContents(session?.user.id, id, query.folderId, query.search, token);
  }
}
