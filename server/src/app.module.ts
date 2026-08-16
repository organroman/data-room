import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./auth/auth.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { DataroomsModule } from "./datarooms/datarooms.module.js";
import { FoldersModule } from "./folders/folders.module.js";
import { FilesModule } from "./files/files.module.js";
import { StarredModule } from "./starred/starred.module.js";
import { TrashModule } from "./trash/trash.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // App-wide default; the public share-token read path and Better Auth's own
    // /sign-in, /sign-up rules (server/src/auth/auth.ts) get stricter overrides.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule.forRoot({ auth }),
    DataroomsModule,
    FoldersModule,
    FilesModule,
    StarredModule,
    TrashModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
