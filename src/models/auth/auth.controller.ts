import type { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.services.js";
import { ApiResponse } from "../../shared/utils/response.utils.js";
import type {
  InitiateRegisterInput,
  VerifyOtpInput,
  CompleteRegisterInput,
} from "./auth.dto.js";

/**
 * AuthController — HTTP layer only.
 * Responsibilities: parse req, call service, format response.
 * Zero business logic here.
 */
export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    this.authService = new AuthService();

    // Bind methods so `this` is preserved when used as route handlers
    this.initiateRegister = this.initiateRegister.bind(this);
    this.verifyOtp = this.verifyOtp.bind(this);
    this.completeRegister = this.completeRegister.bind(this);
  }

  /**
   * POST /auth/register/initiate
   * Creates PENDING user and sends OTP to phone
   */
  async initiateRegister(
    req: Request<{}, {}, InitiateRegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.authService.initiateRegister(req.body);
      ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register/verify-otp
   * Verifies the OTP and marks phone as verified
   */
  async verifyOtp(
    req: Request<{}, {}, VerifyOtpInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.authService.verifyOtp(req.body);
      ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register/complete
   * Sets password and activates account
   */
  async completeRegister(
    req: Request<{}, {}, CompleteRegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.authService.completeRegister(req.body);
      ApiResponse.created(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}