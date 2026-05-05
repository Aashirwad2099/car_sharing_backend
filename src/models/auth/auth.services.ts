import type {
  InitiateRegisterInput,
  VerifyOtpInput,
  CompleteRegisterInput,
  ResendOtpInput,
  LoginInput,
  ForgotPasswordInput,
  VerifyForgotPasswordOtpInput,
  ResetPasswordInput,
} from "./auth.dto.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthErrorCode } from "./auth.error.js";
import { HashUtil } from "../../shared/utils/hash.utils.js";
import { OtpUtil } from "../../shared/utils/otp.util.js";
import { JwtUtil } from "../../shared/utils/jwt.utils.js";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
  TooManyRequestsError,
  UnauthorizedError,
  ForbiddenError,
} from "../../shared/errors/HttpError.js";

const RESEND_COOLDOWN_SECONDS = 60;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    accountStatus: string;
  };
  tokens: AuthTokens;
}

export class AuthService {
  private readonly repo: AuthRepository;

  constructor() {
    this.repo = new AuthRepository();
  }

  // ─── Step 1: Initiate Registration ─────────────────────

  async initiateRegister(input: InitiateRegisterInput): Promise<{
    message: string;
    otpExpiresInMinutes: number;
    _devOtp?: string;
  }> {
    const { name, phone, roleId } = input;

    const role = await this.repo.findRoleById(roleId);
    if (!role) {
      throw new NotFoundError("Role not found", AuthErrorCode.ROLE_NOT_FOUND);
    }

    const existingUser = await this.repo.findUserByPhone(phone);
    if (existingUser && existingUser.accountStatus === "ACTIVE") {
      throw new ConflictError("Phone number already registered", AuthErrorCode.PHONE_ALREADY_EXISTS);
    }

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const user = await this.repo.createUser({ name, phone, roleId });
      userId = user.id;
    }

    await this.repo.invalidatePreviousOtps(phone, "REGISTER");

    const otp = OtpUtil.generate();
    await this.repo.createOtpVerification({
      userId,
      phone,
      otpHash: OtpUtil.hash(otp),
      purpose: "REGISTER",
      expiresAt: OtpUtil.getExpiryDate(),
    });

    console.log("─────────────────────────────────────");
    console.log(`📱 [SMS MOCK] To: ${phone}`);
    console.log(`🔑 [SMS MOCK] OTP: ${otp}`);
    console.log("─────────────────────────────────────");

    return {
      message: `OTP sent to ${phone}`,
      otpExpiresInMinutes: OtpUtil.expiryMinutes,
      ...(process.env.NODE_ENV !== "production" && { _devOtp: otp }),
    };
  }

  // ─── Resend OTP ─────────────────────────────────────────

  async resendOtp(input: ResendOtpInput): Promise<{
    message: string;
    otpExpiresInMinutes: number;
    _devOtp?: string;
  }> {
    const { phone } = input;

    const user = await this.repo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError("No account found for this phone", AuthErrorCode.ACCOUNT_NOT_FOUND);
    }

    if (user.accountStatus === "ACTIVE") {
      throw new ConflictError("Phone number already registered", AuthErrorCode.PHONE_ALREADY_EXISTS);
    }

    const lastOtp = await this.repo.findLatestOtp(phone, "REGISTER");
    if (lastOtp) {
      const secondsSinceLast = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast);
        throw new TooManyRequestsError(
          `Please wait ${waitSeconds} second(s) before requesting a new OTP.`,
          AuthErrorCode.OTP_RESEND_TOO_SOON
        );
      }
    }

    await this.repo.invalidatePreviousOtps(phone, "REGISTER");

    const otp = OtpUtil.generate();
    await this.repo.createOtpVerification({
      userId: user.id,
      phone,
      otpHash: OtpUtil.hash(otp),
      purpose: "REGISTER",
      expiresAt: OtpUtil.getExpiryDate(),
    });

    console.log("─────────────────────────────────────");
    console.log(`📱 [SMS MOCK - RESEND] To: ${phone}`);
    console.log(`🔑 [SMS MOCK - RESEND] OTP: ${otp}`);
    console.log("─────────────────────────────────────");

    return {
      message: `OTP resent to ${phone}`,
      otpExpiresInMinutes: OtpUtil.expiryMinutes,
      ...(process.env.NODE_ENV !== "production" && { _devOtp: otp }),
    };
  }

  // ─── Step 2: Verify OTP ─────────────────────────────────

  async verifyOtp(input: VerifyOtpInput): Promise<{ message: string }> {
    const { phone, otp } = input;

    const user = await this.repo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError("No account found for this phone", AuthErrorCode.ACCOUNT_NOT_FOUND);
    }

    if (user.isPhoneVerified) {
      throw new BadRequestError("Phone number already verified", AuthErrorCode.PHONE_ALREADY_VERIFIED);
    }

    const otpRecord = await this.repo.findActiveOtp(phone, "REGISTER");
    if (!otpRecord) {
      throw new BadRequestError(
        "OTP not found or expired. Please request a new one.",
        AuthErrorCode.OTP_EXPIRED
      );
    }

    if (otpRecord.attempts >= OtpUtil.maxAttempts) {
      throw new TooManyRequestsError(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
        AuthErrorCode.OTP_MAX_ATTEMPTS
      );
    }

    await this.repo.incrementOtpAttempts(otpRecord.id);

    const isValid = OtpUtil.verify(otp, otpRecord.otpHash);
    if (!isValid) {
      const remaining = OtpUtil.maxAttempts - (otpRecord.attempts + 1);
      throw new BadRequestError(
        `Invalid OTP. ${remaining} attempt(s) remaining.`,
        AuthErrorCode.OTP_INVALID
      );
    }

    await Promise.all([
      this.repo.markOtpUsed(otpRecord.id),
      this.repo.markPhoneVerified(user.id),
    ]);

    return { message: "Phone verified successfully" };
  }

  // ─── Step 3: Complete Registration ──────────────────────
  // *** CHANGED: now creates OwnerProfile or CustomerProfile inside a transaction

  async completeRegister(input: CompleteRegisterInput): Promise<{ message: string; userId: string }> {
    const { phone, password, businessLat, businessLng } = input;

    // 1. Fetch user with role
    const user = await this.repo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError("No account found for this phone", AuthErrorCode.ACCOUNT_NOT_FOUND);
    }

    if (!user.isPhoneVerified) {
      throw new BadRequestError(
        "Please verify your phone number before completing registration",
        AuthErrorCode.PHONE_NOT_VERIFIED
      );
    }

    if (user.accountStatus !== "PENDING") {
      throw new ConflictError("Account already registered", AuthErrorCode.PHONE_ALREADY_EXISTS);
    }

    // 2. Owner must provide business location
    const roleName = user.role.name.toLowerCase();
    if (roleName === "owner") {
      if (businessLat === undefined || businessLng === undefined) {
        throw new BadRequestError(
          "Business location (businessLat, businessLng) is required for owner registration",
          "OWNER_LOCATION_REQUIRED"
        );
      }
    }

    // 3. Hash password
    const passwordHash = await HashUtil.hashPassword(password);

    // 4. Activate user + create profile — all in one transaction
    const updatedUser = await this.repo.activateUserWithProfile(
      user.id,
      passwordHash,
      user.role.name,
      roleName === "owner" ? { businessLat: businessLat!, businessLng: businessLng! } : undefined
    );

    return {
      message: "Registration complete. You can now log in.",
      userId: updatedUser.id,
    };
  }

  // ─── Login ──────────────────────────────────────────────

  async login(
    input: LoginInput,
    meta: { ipAddress?: string; deviceInfo?: string }
  ): Promise<LoginResult> {
    const { phone, password } = input;

    const user = await this.repo.findUserByPhone(phone);

    if (!user) {
      throw new UnauthorizedError("Invalid phone number or password", AuthErrorCode.INVALID_CREDENTIALS);
    }

    if (user.accountStatus === "PENDING") {
      throw new ForbiddenError(
        "Account registration is incomplete. Please complete registration first.",
        AuthErrorCode.ACCOUNT_PENDING
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      throw new ForbiddenError(
        "Your account has been suspended. Please contact support.",
        AuthErrorCode.ACCOUNT_SUSPENDED
      );
    }

    if (user.accountStatus === "DELETED") {
      throw new UnauthorizedError("Invalid phone number or password", AuthErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError("Invalid phone number or password", AuthErrorCode.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await HashUtil.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid phone number or password", AuthErrorCode.INVALID_CREDENTIALS);
    }

    await this.repo.enforceMaxSessions(user.id, 5);

    const jwtPayload = { sub: user.id, phone: user.phone, roleId: user.roleId };
    const accessToken = JwtUtil.signAccessToken(jwtPayload);
    const rawRefreshToken = HashUtil.generateSecureToken();

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: HashUtil.sha256(rawRefreshToken),
      ipAddress: meta.ipAddress,
      deviceInfo: meta.deviceInfo,
      expiresAt: JwtUtil.getRefreshTokenExpiryDate(),
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role.name,
        accountStatus: user.accountStatus,
      },
      tokens: { accessToken, refreshToken: rawRefreshToken },
    };
  }

  // ─── Refresh Tokens ─────────────────────────────────────

  async refreshTokens(
    rawRefreshToken: string,
    meta: { ipAddress?: string; deviceInfo?: string }
  ): Promise<AuthTokens> {
    const tokenHash = HashUtil.sha256(rawRefreshToken);
    const stored = await this.repo.findRefreshToken(tokenHash);

    if (!stored) {
      throw new UnauthorizedError("Invalid refresh token", AuthErrorCode.TOKEN_INVALID);
    }

    if (stored.isRevoked) {
      await this.repo.revokeAllUserRefreshTokens(stored.userId);
      throw new UnauthorizedError(
        "Refresh token has been revoked. Please log in again.",
        AuthErrorCode.TOKEN_REVOKED
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token expired. Please log in again.", AuthErrorCode.TOKEN_EXPIRED);
    }

    const user = await this.repo.findUserById(stored.userId);
    if (!user || user.accountStatus !== "ACTIVE") {
      throw new UnauthorizedError("Account not found or inactive", AuthErrorCode.ACCOUNT_NOT_FOUND);
    }

    await this.repo.revokeRefreshToken(tokenHash);

    const jwtPayload = { sub: user.id, phone: user.phone, roleId: user.roleId };
    const newAccessToken = JwtUtil.signAccessToken(jwtPayload);
    const newRawRefreshToken = HashUtil.generateSecureToken();

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: HashUtil.sha256(newRawRefreshToken),
      ipAddress: meta.ipAddress,
      deviceInfo: meta.deviceInfo,
      expiresAt: JwtUtil.getRefreshTokenExpiryDate(),
    });

    return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
  }

  // ─── Forgot Password: Step 1 — Send OTP ─────────────────

  async forgotPassword(input: ForgotPasswordInput): Promise<{
    message: string;
    otpExpiresInMinutes: number;
    _devOtp?: string;
  }> {
    const { phone } = input;

    const user = await this.repo.findUserByPhone(phone);
    if (!user || user.accountStatus !== "ACTIVE") {
      return {
        message: "If this number is registered, an OTP has been sent.",
        otpExpiresInMinutes: OtpUtil.expiryMinutes,
      };
    }

    const lastOtp = await this.repo.findLatestOtp(phone, "RESET_PASSWORD");
    if (lastOtp) {
      const secondsSinceLast = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast);
        throw new TooManyRequestsError(
          `Please wait ${waitSeconds} second(s) before requesting another OTP.`,
          AuthErrorCode.OTP_RESEND_TOO_SOON
        );
      }
    }

    await this.repo.invalidatePreviousOtps(phone, "RESET_PASSWORD");

    const otp = OtpUtil.generate();
    await this.repo.createOtpVerification({
      userId: user.id,
      phone,
      otpHash: OtpUtil.hash(otp),
      purpose: "RESET_PASSWORD",
      expiresAt: OtpUtil.getExpiryDate(),
    });

    console.log("─────────────────────────────────────");
    console.log(`📱 [SMS MOCK - RESET] To: ${phone}`);
    console.log(`🔑 [SMS MOCK - RESET] OTP: ${otp}`);
    console.log("─────────────────────────────────────");

    return {
      message: "If this number is registered, an OTP has been sent.",
      otpExpiresInMinutes: OtpUtil.expiryMinutes,
      ...(process.env.NODE_ENV !== "production" && { _devOtp: otp }),
    };
  }

  // ─── Forgot Password: Step 2 — Verify OTP ───────────────

  async verifyForgotPasswordOtp(input: VerifyForgotPasswordOtpInput): Promise<{
    message: string;
    resetToken: string;
  }> {
    const { phone, otp } = input;

    const user = await this.repo.findUserByPhone(phone);
    if (!user || user.accountStatus !== "ACTIVE") {
      throw new UnauthorizedError("Invalid request", AuthErrorCode.ACCOUNT_NOT_FOUND);
    }

    const otpRecord = await this.repo.findActiveOtp(phone, "RESET_PASSWORD");
    if (!otpRecord) {
      throw new BadRequestError(
        "OTP not found or expired. Please request a new one.",
        AuthErrorCode.OTP_EXPIRED
      );
    }

    if (otpRecord.attempts >= OtpUtil.maxAttempts) {
      throw new TooManyRequestsError(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
        AuthErrorCode.OTP_MAX_ATTEMPTS
      );
    }

    await this.repo.incrementOtpAttempts(otpRecord.id);

    const isValid = OtpUtil.verify(otp, otpRecord.otpHash);
    if (!isValid) {
      const remaining = OtpUtil.maxAttempts - (otpRecord.attempts + 1);
      throw new BadRequestError(
        `Invalid OTP. ${remaining} attempt(s) remaining.`,
        AuthErrorCode.OTP_INVALID
      );
    }

    await this.repo.markOtpUsed(otpRecord.id);

    await this.repo.invalidatePreviousResetTokens(user.id);

    const rawResetToken = HashUtil.generateSecureToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await this.repo.createPasswordResetToken({
      userId: user.id,
      tokenHash: HashUtil.sha256(rawResetToken),
      expiresAt,
    });

    return {
      message: "OTP verified. Use the reset token to set your new password.",
      resetToken: rawResetToken,
    };
  }

  // ─── Forgot Password: Step 3 — Reset Password ───────────

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const { phone, resetToken, password } = input;

    const user = await this.repo.findUserByPhone(phone);
    if (!user || user.accountStatus !== "ACTIVE") {
      throw new UnauthorizedError("Invalid request", AuthErrorCode.ACCOUNT_NOT_FOUND);
    }

    const tokenHash = HashUtil.sha256(resetToken);
    const storedToken = await this.repo.findPasswordResetToken(tokenHash);

    if (!storedToken || storedToken.userId !== user.id) {
      throw new BadRequestError("Invalid reset token", AuthErrorCode.RESET_TOKEN_INVALID);
    }

    if (storedToken.isUsed) {
      throw new BadRequestError(
        "Reset token has already been used. Please request a new one.",
        AuthErrorCode.RESET_TOKEN_USED
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new BadRequestError(
        "Reset token has expired. Please request a new one.",
        AuthErrorCode.RESET_TOKEN_EXPIRED
      );
    }

    const passwordHash = await HashUtil.hashPassword(password);

    await Promise.all([
      this.repo.updateUserPassword(user.id, passwordHash),
      this.repo.markResetTokenUsed(storedToken.id),
      this.repo.revokeAllUserRefreshTokens(user.id),
    ]);

    return { message: "Password reset successfully. Please log in with your new password." };
  }
}