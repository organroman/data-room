import { STATUS_CODES } from "node:http";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "error" in value && "message" in value;
}

/**
 * Catch-all so every error response — ApiException, Nest's own built-ins (e.g. an
 * unauthenticated request rejected by the global auth guard), or a truly unexpected
 * throw — comes back as {error, message, details?}, matching what the frontend's
 * ApiClientError parsing (shared/api/client.ts) expects. 1:1 port of v1's app.ts error
 * middleware.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (isApiErrorBody(body)) {
        response.status(status).json(body);
        return;
      }
      const message = typeof body === "string" ? body : exception.message;
      // Nest's built-in exceptions (e.g. the auth guard's UnauthorizedException) don't
      // always carry an {error, message} body — derive a snake_case code from the HTTP
      // status's reason phrase ("Unauthorized" -> "unauthorized") so the shape still
      // matches ApiException's own codes ("not_found", "conflict", "bad_request").
      const reason = STATUS_CODES[status] ?? "Error";
      const code = reason.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "error";
      response.status(status).json({ error: code, message } satisfies ApiErrorBody);
      return;
    }

    this.logger.error(exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: "internal_error", message: "Something went wrong" } satisfies ApiErrorBody);
  }
}
