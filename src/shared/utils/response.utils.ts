import type { Response } from "express";

interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: unknown;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = "Success",
    statusCode = 200
  ): Response<SuccessResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created<T>(
    res: Response,
    data: T,
    message = "Created successfully"
  ): Response<SuccessResponse<T>> {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  errors?: unknown
): Response<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    message,
  };

  if (code) {
    response.code = code;
  }

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}
}