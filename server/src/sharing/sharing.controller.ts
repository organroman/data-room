import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { SharesService } from "./shares.service.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { createShareSchema, sharesQuerySchema } from "../../../shared/validation.js";
import type { CreateShareInput, SharesQuery } from "../../../shared/types.js";

@Controller("shares")
export class SharingController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  createShare(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(createShareSchema, "Invalid request body")) body: CreateShareInput,
  ) {
    return this.sharesService.createShare(session.user.id, body);
  }

  @Get("shared-with-me")
  listSharedWithMe(@Session() session: UserSession) {
    return this.sharesService.listSharedWithMe(session.user.id);
  }

  @Get()
  listSharesForResource(
    @Session() session: UserSession,
    @Query(new ZodValidationPipe(sharesQuerySchema, "Invalid query parameters")) query: SharesQuery,
  ) {
    return this.sharesService.listSharesForResource(session.user.id, query.resourceType, query.resourceId);
  }

  @Delete(":id")
  @HttpCode(204)
  async revokeShare(@Session() session: UserSession, @Param("id") id: string) {
    await this.sharesService.revokeShare(session.user.id, id);
  }

  @Delete(":id/grants/:grantId")
  @HttpCode(204)
  async revokeGrant(
    @Session() session: UserSession,
    @Param("id") id: string,
    @Param("grantId") grantId: string,
  ) {
    await this.sharesService.revokeGrant(session.user.id, id, grantId);
  }
}
