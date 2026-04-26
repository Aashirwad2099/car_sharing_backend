import type {
  InitiateRegisterInput,
  VerifyOtpInput,
  CompleteRegisterInput,
  LoginInput,
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

/**
 * AuthService — orchestrates all auth business logic.
 *
 * Registration flow (3 steps):
 *   1. initiateRegister  → create PENDING user, send OTP
 *   2. verifyOtp         → verify OTP, mark phone verified
 *   3. completeRegister  → set password, activate account
 *
 * Login flow (1 step):
 *   4. login             → phone + password → access + refresh token
 *   5. refreshTokens     → rotate refresh token → new token pair
 */
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
      throw new ConflictError(
        "Phone number already registered",
        AuthErrorCode.PHONE_ALREADY_EXISTS
      );
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
    const otpHash = OtpUtil.hash(otp);
    const expiresAt = OtpUtil.getExpiryDate();

    await this.repo.createOtpVerification({
      userId,
      phone,
      otpHash,
      purpose: "REGISTER",
      expiresAt,
    });

    // TODO: await SmsService.sendOtp(phone, otp);
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

  // ─── Step 2: Verify OTP ─────────────────────────────────

  async verifyOtp(input: VerifyOtpInput): Promise<{ message: string }> {
    const { phone, otp } = input;

    const user = await this.repo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError(
        "No account found for this phone",
        AuthErrorCode.ACCOUNT_NOT_FOUND
      );
    }

    if (user.isPhoneVerified) {
      throw new BadRequestError(
        "Phone number already verified",
        AuthErrorCode.PHONE_ALREADY_VERIFIED
      );
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
      const remainingAttempts = OtpUtil.maxAttempts - (otpRecord.attempts + 1);
      throw new BadRequestError(
        `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
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

  async completeRegister(
    input: CompleteRegisterInput
  ): Promise<{ message: string; userId: string }> {
    const { phone, password } = input;

    const user = await this.repo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError(
        "No account found for this phone",
        AuthErrorCode.ACCOUNT_NOT_FOUND
      );
    }

    if (!user.isPhoneVerified) {
      throw new BadRequestError(
        "Please verify your phone number before completing registration",
        AuthErrorCode.PHONE_NOT_VERIFIED
      );
    }

    if (user.accountStatus !== "PENDING") {
      throw new ConflictError(
        "Account already registered",
        AuthErrorCode.PHONE_ALREADY_EXISTS
      );
    }

    const passwordHash = await HashUtil.hashPassword(password);
    const updatedUser = await this.repo.updateUserPasswordAndActivate(
      user.id,
      passwordHash
    );

    return {
      message: "Registration complete. You can now log in.",
      userId: updatedUser.id,
    };
  }

  // ─── Step 4: Login ──────────────────────────────────────

  async login(
    input: LoginInput,
    meta: { ipAddress?: string; deviceInfo?: string }
  ): Promise<LoginResult> {
    const { phone, password } = input;

    // 1. Find user — always include role for JWT payload
    const user = await this.repo.findUserByPhone(phone);

    // 2. User not found — use generic error (don't reveal if phone exists)
    if (!user) {
      throw new UnauthorizedError(
        "Invalid phone number or password",
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // 3. Account state checks
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
      throw new UnauthorizedError(
        "Invalid phone number or password",
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // 4. Password check — must have one (ACTIVE accounts always do)
    if (!user.passwordHash) {
      throw new UnauthorizedError(
        "Invalid phone number or password",
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // 5. Constant-time bcrypt comparison — prevents timing attacks
    const isPasswordValid = await HashUtil.comparePassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError(
        "Invalid phone number or password",
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // 6. Enforce max 5 active sessions per user (revokes oldest)
    await this.repo.enforceMaxSessions(user.id, 5);

    // 7. Generate token pair
    const jwtPayload = { sub: user.id, phone: user.phone, roleId: user.roleId };
    const accessToken = JwtUtil.signAccessToken(jwtPayload);
    const rawRefreshToken = HashUtil.generateSecureToken(); // random 32-byte hex

    // 8. Hash and persist refresh token
    const refreshTokenHash = HashUtil.sha256(rawRefreshToken);
    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
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
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken, // raw token sent to client, hash stored in DB
      },
    };
  }

  // ─── Step 5: Refresh Tokens ─────────────────────────────

  async refreshTokens(
    rawRefreshToken: string,
    meta: { ipAddress?: string; deviceInfo?: string }
  ): Promise<AuthTokens> {
    // 1. Hash the incoming token and look it up
    const tokenHash = HashUtil.sha256(rawRefreshToken);
    const stored = await this.repo.findRefreshToken(tokenHash);

    if (!stored) {
      throw new UnauthorizedError(
        "Invalid refresh token",
        AuthErrorCode.TOKEN_INVALID
      );
    }

    // 2. Check revoked
    if (stored.isRevoked) {
      // Possible token theft — revoke all sessions for this user
      await this.repo.revokeAllUserRefreshTokens(stored.userId);
      throw new UnauthorizedError(
        "Refresh token has been revoked. Please log in again.",
        AuthErrorCode.TOKEN_REVOKED
      );
    }

    // 3. Check expiry
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError(
        "Refresh token expired. Please log in again.",
        AuthErrorCode.TOKEN_EXPIRED
      );
    }

    // 4. Load user
    const user = await this.repo.findUserById(stored.userId);
    if (!user || user.accountStatus !== "ACTIVE") {
      throw new UnauthorizedError(
        "Account not found or inactive",
        AuthErrorCode.ACCOUNT_NOT_FOUND
      );
    }

    // 5. Rotate — revoke old token, issue new pair
    await this.repo.revokeRefreshToken(tokenHash);

    const jwtPayload = { sub: user.id, phone: user.phone, roleId: user.roleId };
    const newAccessToken = JwtUtil.signAccessToken(jwtPayload);
    const newRawRefreshToken = HashUtil.generateSecureToken();
    const newRefreshTokenHash = HashUtil.sha256(newRawRefreshToken);

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      ipAddress: meta.ipAddress,
      deviceInfo: meta.deviceInfo,
      expiresAt: JwtUtil.getRefreshTokenExpiryDate(),
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }
}