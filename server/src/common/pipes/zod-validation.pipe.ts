import { Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ApiException } from "../exceptions/api.exception.js";

/**
 * Reuses shared/validation.ts's zod schemas as-is (same schemas the frontend's zodResolver
 * forms validate against) instead of rewriting the API's request DTOs as class-validator
 * classes — see CLAUDE.md §2. 1:1 port of v1's server/lib/validate.ts.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodType,
    private readonly invalidMessage = "Invalid request",
  ) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw ApiException.badRequest(this.invalidMessage, result.error.flatten());
    }
    return result.data;
  }
}
