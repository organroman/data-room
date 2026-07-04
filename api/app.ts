import express, { type ErrorRequestHandler } from "express";
import { dataroomsRouter } from "./routes/datarooms";
import { foldersRouter } from "./routes/folders";
import { filesRouter } from "./routes/files";
import { trashRouter } from "./routes/trash";
import { starredRouter } from "./routes/starred";
import { ApiError } from "./lib/errors";
import type { ApiErrorBody } from "@shared/types";

export const app = express();

app.use(express.json());

app.use("/api/datarooms", dataroomsRouter);
app.use("/api/folders", foldersRouter);
app.use("/api/files", filesRouter);
app.use("/api/trash", trashRouter);
app.use("/api/starred", starredRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", message: `No route for ${req.method} ${req.path}` } satisfies ApiErrorBody);
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.code, message: err.message, details: err.details } satisfies ApiErrorBody);
    return;
  }
  console.error(err);
  res.status(500).json({ error: "internal_error", message: "Something went wrong" } satisfies ApiErrorBody);
};
app.use(errorHandler);
