import type { OtpPurpose, User, OtpVerification, Role, RefreshToken } from "@prisma/client";
import { prisma } from "../../config/database.js";

/**
 * AuthRepository — owns all DB queries for the auth domain.
 * No business logic here; only data access.
 */
export class AuthRepository {
  // ─── User ──────────────────────────────────────────────

  async findUserByPhone(phone: string): Promise<(User & { role: Role }) | null> {
    return prisma.user.findUnique({
      where: { phone },
      include: { role: true },
    });
  }

  async findUserById(id: string): Promise<(User & { role: Role }) | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async createUser(data: {
    name: string;
    phone: string;
    roleId: number;
  }): Promise<User> {
    return prisma.user.create({ data });
  }

  async updateUserPasswordAndActivate(
    userId: string,
    passwordHash: string
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, accountStatus: "ACTIVE" },
    });
  }

  async markPhoneVerified(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { isPhoneVerified: true },
    });
  }

  // ─── Role ──────────────────────────────────────────────

  async findRoleById(roleId: number): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id: roleId } });
  }

  // ─── OTP ───────────────────────────────────────────────

  async invalidatePreviousOtps(phone: string, purpose: OtpPurpose): Promise<void> {
    await prisma.otpVerification.updateMany({
      where: { phone, purpose, isUsed: false },
      data: { isUsed: true },
    });
  }

  async createOtpVerification(data: {
    userId?: string;
    phone: string;
    otpHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<OtpVerification> {
    return prisma.otpVerification.create({ data });
  }

  async findActiveOtp(phone: string, purpose: OtpPurpose): Promise<OtpVerification | null> {
    return prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async incrementOtpAttempts(otpId: string): Promise<OtpVerification> {
    return prisma.otpVerification.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
    });
  }

  async markOtpUsed(otpId: string): Promise<void> {
    await prisma.otpVerification.update({
      where: { id: otpId },
      data: { isUsed: true },
    });
  }

  // ─── Refresh Token ─────────────────────────────────────

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all active refresh tokens for a user.
   * Used on logout-all-devices or account suspension.
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Enforce a max of N active sessions per user.
   * Revokes oldest tokens beyond the limit.
   */
  async enforceMaxSessions(userId: string, maxSessions = 5): Promise<void> {
    const activeTokens = await prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" }, // oldest first
    });

    if (activeTokens.length >= maxSessions) {
      const toRevoke = activeTokens.slice(0, activeTokens.length - maxSessions + 1);
      await prisma.refreshToken.updateMany({
        where: { id: { in: toRevoke.map((t) => t.id) } },
        data: { isRevoked: true },
      });
    }
  }
}