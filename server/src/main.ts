import "dotenv/config";
import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Required by @thallesp/nestjs-better-auth — Better Auth reads the raw request body itself.
    bodyParser: false,
  });

  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  // Better Auth is mounted directly on the underlying HTTP adapter at its own explicit
  // basePath ("/api/auth", set in auth.ts) and bypasses this prefix entirely — it composes
  // correctly since the two never overlap.
  app.setGlobalPrefix("api");

  // Render (and most PaaS hosts) assign the actual listening port via PORT at runtime and
  // expect the app to bind to it — NEST_PORT is only the local-dev override (see .env.example).
  const port = Number(process.env.PORT ?? process.env.NEST_PORT ?? 3001);
  await app.listen(port);
}

bootstrap();
