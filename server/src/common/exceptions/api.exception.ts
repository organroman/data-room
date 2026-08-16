import { HttpException, HttpStatus } from "@nestjs/common";

/** 1:1 port of v1's server/lib/errors.ts ApiError — same {error, message, details} shape. */
export class ApiException extends HttpException {
  constructor(status: number, code: string, message: string, details?: unknown) {
    super({ error: code, message, details }, status);
  }

  static notFound(what: string) {
    return new ApiException(HttpStatus.NOT_FOUND, "not_found", `${what} not found`);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiException(HttpStatus.CONFLICT, "conflict", message, details);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiException(HttpStatus.BAD_REQUEST, "bad_request", message, details);
  }
}
