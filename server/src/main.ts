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

  const port = Number(process.env.NEST_PORT ?? 3001);
  await app.listen(port);
}

bootstrap();
