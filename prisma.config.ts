import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Config for the v2 (NestJS) backend's Prisma schema — kept at the repo root since that's
// where `prisma` CLI commands are invoked from (see the prisma:* scripts in package.json).
export default defineConfig({
  schema: "server/prisma/schema.prisma",
  migrations: {
    path: "server/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
