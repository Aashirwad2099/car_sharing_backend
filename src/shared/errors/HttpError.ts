import { AppError } from "./AppError.js";

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", code?: string) {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code?: string) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code?: string) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not Found", code?: string) {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code?: string) {
    super(message, 409, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", code?: string) {
    super(message, 429, code);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error", code?: string) {
    super(message, 500, code, false);
  }
}