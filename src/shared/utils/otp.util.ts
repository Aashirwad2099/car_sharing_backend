import crypto from "crypto";
import { HashUtil } from "./hash.utils";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

export class OtpUtil {
  /**
   * Generate a numeric OTP of fixed length
   */
  static generate(): string {
    const max = Math.pow(10, OTP_LENGTH);
    const otp = crypto.randomInt(0, max);
    return otp.toString().padStart(OTP_LENGTH, "0");
  }

  /**
   * Hash the OTP with SHA-256 (fast, since OTPs are short-lived)
   * We don't use bcrypt here because OTPs expire quickly and
   * timing attacks are mitigated by the attempt limit.
   */
  static hash(otp: string): string {
    return HashUtil.sha256(otp);
  }

  /**
   * Verify a plain OTP against its stored hash
   */
  static verify(plainOtp: string, storedHash: string): boolean {
    const inputHash = OtpUtil.hash(plainOtp);
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(inputHash, "hex"),
      Buffer.from(storedHash, "hex")
    );
  }

  /**
   * Returns a Date that is OTP_EXPIRY_MINUTES from now
   */
  static getExpiryDate(): Date {
    return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  static get maxAttempts(): number {
    return MAX_OTP_ATTEMPTS;
  }

  static get expiryMinutes(): number {
    return OTP_EXPIRY_MINUTES;
  }
}