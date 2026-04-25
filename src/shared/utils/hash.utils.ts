import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export class HashUtil {
  /**
   * Hash a plain-text password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare a plain password against a bcrypt hash
   */
  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * SHA-256 hash for tokens (refresh tokens, reset tokens)
   * Not suitable for passwords — use bcrypt for those.
   */
  static sha256(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  /**
   * Cryptographically secure random token (hex string)
   */
  static generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  }
}