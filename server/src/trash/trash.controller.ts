import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { TrashService } from "./trash.service.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { trashQuerySchema } from "../../../shared/validation.js";
import type { EntityType, TrashQuery } from "../../../shared/types.js";

@Controller("trash")
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get()
  listTrash(
    @Session() session: UserSession,
    @Query(new ZodValidationPipe(trashQuerySchema, "Invalid query parameters")) query: TrashQuery,
  ) {
    return this.trashService.listTrash(session.user.id, query.dataroomId);
  }

  @Post(":type/:id/restore")
  @HttpCode(204)
  async restoreTrashEntry(
    @Session() session: UserSession,
    @Param("type") type: EntityType,
    @Param("id") id: string,
  ) {
    await this.trashService.restoreTrashEntry(session.user.id, type, id);
  }

  @Post("empty")
  @HttpCode(204)
  async emptyTrash(
    @Session() session: UserSession,
    @Query(new ZodValidationPipe(trashQuerySchema, "Invalid query parameters")) query: TrashQuery,
  ) {
    await this.trashService.emptyTrash(session.user.id, query.dataroomId);
  }
}
