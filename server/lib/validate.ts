import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ApiError } from "./errors";

declare global {
  namespace Express {
    interface Request {
      /** Query params after zod parsing/coercion (req.query itself stays the raw ParsedQs). */
      validatedQuery?: unknown;
    }
  }
}

/** Validates req.body against `schema` and replaces it with the parsed (and possibly transformed) value. */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(ApiError.badRequest("Invalid request body", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Validates req.query against `schema` and exposes the parsed value as req.validatedQuery. */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(ApiError.badRequest("Invalid query parameters", result.error.flatten()));
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}
