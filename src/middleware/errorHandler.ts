import type { Request, Response, NextFunction } from "express";
import { AppError } from "../shared/errors/AppError.js";
import { ApiResponse } from "../shared/utils/response.utils.js";
import { env } from "../config/env.js";

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * Handles both operational errors (AppError) and unexpected crashes.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Operational errors (thrown intentionally by our code)
  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode, err.code);
    return;
  }

  // Prisma known errors (unique constraint, not found, etc.)
  if (isPrismaError(err)) {
    const { statusCode, message, code } = parsePrismaError(err);
    ApiResponse.error(res, message, statusCode, code);
    return;
  }

  // Unexpected/programmer errors — log full stack, return generic message
  console.error("💥 Unhandled Error:", err);

  ApiResponse.error(
    res,
    env.isDev ? err.message : "Something went wrong. Please try again later.",
    500,
    "INTERNAL_SERVER_ERROR",
    env.isDev ? err.stack : undefined
  );
};

// ─── Prisma error helpers ─────────────────────────────────

function isPrismaError(err: unknown): err is { code: string; meta?: unknown } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string" &&
    (err as { code: string }).code.startsWith("P")
  );
}

function parsePrismaError(err: { code: string; meta?: unknown }): {
  statusCode: number;
  message: string;
  code: string;
} {
  switch (err.code) {
    case "P2002": // Unique constraint violation
      return {
        statusCode: 409,
        message: "A record with this value already exists",
        code: "DB_UNIQUE_VIOLATION",
      };
    case "P2025": // Record not found
      return {
        statusCode: 404,
        message: "Record not found",
        code: "DB_NOT_FOUND",
      };
    case "P2003": // Foreign key constraint
      return {
        statusCode: 400,
        message: "Referenced record does not exist",
        code: "DB_FK_VIOLATION",
      };
    default:
      return {
        statusCode: 500,
        message: "Database error",
        code: `DB_ERROR_${err.code}`,
      };
  }
}