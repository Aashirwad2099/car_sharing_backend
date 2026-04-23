import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = (err as AppError).statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(env.isDev && { stack: err.stack }),
  });
};