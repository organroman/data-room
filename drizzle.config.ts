import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

export default defineConfig({
  schema: "./api/db/schema.ts",
  out: "./api/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
});
