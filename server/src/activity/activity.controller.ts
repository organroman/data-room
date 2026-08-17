import { Controller, Get, Param } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ActivityService } from "./activity.service.js";

// Shares the "datarooms" path prefix with DataroomsController — Nest allows multiple
// controllers on the same prefix, and ":id/activity" doesn't collide with any of its routes.
@Controller("datarooms")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get(":id/activity")
  getDataroomActivity(@Session() session: UserSession, @Param("id") id: string) {
    return this.activityService.getDataroomActivity(session.user.id, id);
  }
}
