import type { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.services.js";
import { ApiResponse } from "../../shared/utils/response.utils.js";
import type {
  InitiateRegisterInput,
  VerifyOtpInput,
  CompleteRegisterInput,
  LoginInput,
} from "./auth.dto.js";

/**
 * AuthController — HTTP layer only.
 * Parses request → calls service → formats response.
 * Zero business logic here.
 */
export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    this.authService = new AuthService();

    // Bind so `this` is preserved when methods are used as route handlers
    this.initiateRegister  = this.initiateRegister.bind(this);
    this.verifyOtp         = this.verifyOtp.bind(this);
    this.completeRegister  = this.completeRegister.bind(this);
    this.login             = this.login.bind(this);
    this.refreshTokens     = this.refreshTokens.bind(this);
  }

  // POST /auth/register/initiate
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

  // POST /auth/register/verify-otp
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

  // POST /auth/register/complete
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

  // POST /auth/login
  async login(
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const meta = {
        ipAddress: req.ip ?? req.socket.remoteAddress,
        deviceInfo: req.headers["user-agent"],
      };

      const result = await this.authService.login(req.body, meta);
      ApiResponse.success(res, result, "Login successful");
    } catch (error) {
      next(error);
    }
  }

  // POST /auth/refresh
  async refreshTokens(
    req: Request<{}, {}, { refreshToken: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ success: false, message: "Refresh token is required" });
        return;
      }

      const meta = {
        ipAddress: req.ip ?? req.socket.remoteAddress,
        deviceInfo: req.headers["user-agent"],
      };

      const tokens = await this.authService.refreshTokens(refreshToken, meta);
      ApiResponse.success(res, tokens, "Tokens refreshed successfully");
    } catch (error) {
      next(error);
    }
  }
}