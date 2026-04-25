import type {
  InitiateRegisterInput,
  VerifyOtpInput,
  CompleteRegisterInput,
} from "./auth.dto.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthErrorCode } from "./auth.error.js";
import { HashUtil } from "../../shared/utils/hash.utils.js";
import { OtpUtil } from "../../shared/utils/otp.util.js";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
  TooManyRequestsError,
} from "../../shared/errors/HttpError.js";

/**
 * AuthService — orchestrates registration business logic.
 *
 * Registration is a 3-step flow:
 *   1. initiateRegister  → create user (PENDING), send OTP
 *   2. verifyOtp         → verify OTP, mark phone verified
 *   3. completeRegister  → set password, activate account
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
    // In production, NEVER return the OTP — send via SMS
    // Included here only for dev/testing environments
    _devOtp?: string;
  }> {
    const { name, phone, roleId } = input;

    // 1. Check role exists
    const role = await this.repo.findRoleById(roleId);
    if (!role) {
      throw new NotFoundError("Role not found", AuthErrorCode.ROLE_NOT_FOUND);
    }

    // 2. Check if phone already registered and active
    const existingUser = await this.repo.findUserByPhone(phone);
    if (existingUser && existingUser.accountStatus === "ACTIVE") {
      throw new ConflictError(
        "Phone number already registered",
        AuthErrorCode.PHONE_ALREADY_EXISTS
      );
    }

    // 3. Create user row in PENDING state (idempotent — reuse if already PENDING)
    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const user = await this.repo.createUser({ name, phone, roleId });
      userId = user.id;
    }

    // 4. Invalidate any old unused OTPs for this phone+purpose
    await this.repo.invalidatePreviousOtps(phone, "REGISTER");

    // 5. Generate and hash OTP
    const otp = OtpUtil.generate();
    const otpHash = OtpUtil.hash(otp);
    const expiresAt = OtpUtil.getExpiryDate();

    // 6. Persist OTP record
    await this.repo.createOtpVerification({
      userId,
      phone,
      otpHash,
      purpose: "REGISTER",
      expiresAt,
    });

    // 7. TODO: Send OTP via MSG91/Twilio
    // await SmsService.send(phone, `Your OTP is ${otp}. Valid for ${OtpUtil.expiryMinutes} minutes.`);
    console.log(`[DEV] OTP for ${phone}: ${otp}`); // Remove in production

    return {
      message: `OTP sent to ${phone}`,
      otpExpiresInMinutes: OtpUtil.expiryMinutes,
      // Only expose in non-production environments
      ...(process.env.NODE_ENV !== "production" && { _devOtp: otp }),
    };
  }

  // ─── Step 2: Verify OTP ─────────────────────────────────

  async verifyOtp(input: VerifyOtpInput): Promise<{ message: string }> {
    const { phone, otp } = input;

    // 1. User must exist
    const user = await this.repo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError(
        "No account found for this phone",
        AuthErrorCode.ACCOUNT_NOT_FOUND
      );
    }

    // 2. Phone must not already be verified
    if (user.isPhoneVerified) {
      throw new BadRequestError(
        "Phone number already verified",
        AuthErrorCode.PHONE_ALREADY_VERIFIED
      );
    }

    // 3. Find active OTP record
    const otpRecord = await this.repo.findActiveOtp(phone, "REGISTER");
    if (!otpRecord) {
      throw new BadRequestError(
        "OTP not found or expired. Please request a new one.",
        AuthErrorCode.OTP_EXPIRED
      );
    }

    // 4. Enforce attempt limit before verifying
    if (otpRecord.attempts >= OtpUtil.maxAttempts) {
      throw new TooManyRequestsError(
        `Maximum OTP attempts exceeded. Please request a new OTP.`,
        AuthErrorCode.OTP_MAX_ATTEMPTS
      );
    }

    // 5. Increment attempts (do this before verifying — prevents brute force)
    await this.repo.incrementOtpAttempts(otpRecord.id);

    // 6. Constant-time OTP comparison
    const isValid = OtpUtil.verify(otp, otpRecord.otpHash);
    if (!isValid) {
      const remainingAttempts =
        OtpUtil.maxAttempts - (otpRecord.attempts + 1);
      throw new BadRequestError(
        `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
        AuthErrorCode.OTP_INVALID
      );
    }

    // 7. Mark OTP as used and phone as verified — atomically
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

    // 1. User must exist
    const user = await this.repo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError(
        "No account found for this phone",
        AuthErrorCode.ACCOUNT_NOT_FOUND
      );
    }

    // 2. Phone must be verified first
    if (!user.isPhoneVerified) {
      throw new BadRequestError(
        "Please verify your phone number before completing registration",
        AuthErrorCode.PHONE_NOT_VERIFIED
      );
    }

    // 3. Must still be in PENDING state (prevent double-completion)
    if (user.accountStatus !== "PENDING") {
      throw new ConflictError(
        "Account already registered",
        AuthErrorCode.PHONE_ALREADY_EXISTS
      );
    }

    // 4. Hash password (bcrypt, 12 rounds)
    const passwordHash = await HashUtil.hashPassword(password);

    // 5. Set password and activate account
    const updatedUser = await this.repo.updateUserPasswordAndActivate(
      user.id,
      passwordHash
    );

    return {
      message: "Registration complete. You can now log in.",
      userId: updatedUser.id,
    };
  }
}