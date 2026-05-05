import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";
import { ApiResponse } from "../shared/utils/response.utils.js";

/**
 * Validate req.body against a Zod schema
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      ApiResponse.error(res, "Validation failed", 422, "VALIDATION_ERROR", formatZodErrors(result.error));
      return;
    }
    req.body = result.data;
    next();
  };

/**
 * Validate req.query against a Zod schema
 */
export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      ApiResponse.error(res, "Invalid query parameters", 422, "VALIDATION_ERROR", formatZodErrors(result.error));
      return;
    }
    // Express 5 makes req.query a getter — can't reassign directly.
    // Store parsed data on req so downstream handlers can access it.
    (req as any).parsedQuery = result.data;
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