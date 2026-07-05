import express, { type ErrorRequestHandler } from "express";
import { dataroomsRouter } from "./routes/datarooms.js";
import { foldersRouter } from "./routes/folders.js";
import { filesRouter } from "./routes/files.js";
import { trashRouter } from "./routes/trash.js";
import { starredRouter } from "./routes/starred.js";
import { ApiError } from "./lib/errors.js";
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
