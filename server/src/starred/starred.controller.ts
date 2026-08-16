import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { StarredService } from "./starred.service.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { starEntitySchema } from "../../../shared/validation.js";
import type { EntityType, StarEntityInput } from "../../../shared/types.js";

@Controller("starred")
export class StarredController {
  constructor(private readonly starredService: StarredService) {}

  @Get()
  listStarred(@Session() session: UserSession) {
    return this.starredService.listStarredEntries(session.user.id);
  }

  @Post()
  @HttpCode(204)
  async starEntity(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(starEntitySchema, "Invalid request body")) body: StarEntityInput,
  ) {
    await this.starredService.starEntity(session.user.id, body.entityType, body.entityId);
  }

  @Delete(":type/:id")
  @HttpCode(204)
  async unstarEntity(
    @Session() session: UserSession,
    @Param("type") type: EntityType,
    @Param("id") id: string,
  ) {
    await this.starredService.unstarEntity(session.user.id, type, id);
  }
}
