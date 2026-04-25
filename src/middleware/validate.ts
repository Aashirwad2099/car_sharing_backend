import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";
import { ApiResponse } from "../shared/utils/response.utils";

/**
 * Generic Zod validation middleware.
 * Usage: router.post('/route', validate(MyDto), controller.handler)
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      ApiResponse.error(res, "Validation failed", 422, "VALIDATION_ERROR", errors);
      return;
    }

    // Replace req.body with parsed+coerced data (strips unknown fields)
    req.body = result.data;
    next();
  };

function formatZodErrors(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const field = issue.path.join(".") || "body";
    if (!acc[field]) acc[field] = [];
    acc[field].push(issue.message);
    return acc;
  }, {});
}