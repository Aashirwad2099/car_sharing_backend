import type {
  OtpPurpose,
  User,
  OtpVerification,
  Role,
  RefreshToken,
  PasswordResetToken,
} from "@prisma/client";
import { prisma } from "../../config/database.js";

export class AuthRepository {
  // ─── User ──────────────────────────────────────────────

  async findUserByPhone(phone: string): Promise<(User & { role: Role }) | null> {
    return prisma.user.findUnique({ where: { phone }, include: { role: true } });
  }

  async findUserById(id: string): Promise<(User & { role: Role }) | null> {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  }

  async createUser(data: { name: string; phone: string; roleId: number }): Promise<User> {
    return prisma.user.create({ data });
  }

  async updateUserPasswordAndActivate(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, accountStatus: "ACTIVE" },
    });
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
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
      where: { phone, purpose, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findLatestOtp(phone: string, purpose: OtpPurpose): Promise<OtpVerification | null> {
    return prisma.otpVerification.findFirst({
      where: { phone, purpose },
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

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async enforceMaxSessions(userId: string, maxSessions = 5): Promise<void> {
    const activeTokens = await prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    if (activeTokens.length >= maxSessions) {
      const toRevoke = activeTokens.slice(0, activeTokens.length - maxSessions + 1);
      await prisma.refreshToken.updateMany({
        where: { id: { in: toRevoke.map((t) => t.id) } },
        data: { isRevoked: true },
      });
    }
  }

  // ─── Password Reset Token ──────────────────────────────

  async invalidatePreviousResetTokens(userId: string): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });
  }

  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({ data });
  }

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async markResetTokenUsed(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { isUsed: true },
    });
  }

  // ─── Profiles ──────────────────────────────────────────

  /**
   * Atomically activate user + create the correct profile in one transaction.
   * ownerProfile requires businessLat/Lng — passed from registration input.
   * customerProfile just needs userId.
   *
   * roleName is compared case-insensitively so "owner"/"Owner" both work.
   */
  async activateUserWithProfile(
    userId: string,
    passwordHash: string,
    roleName: string,
    ownerLocation?: { businessLat: number; businessLng: number }
  ): Promise<User> {
    return prisma.$transaction(async (tx) => {
      // 1. Activate user + set password
      const user = await tx.user.update({
        where: { id: userId },
        data: { passwordHash, accountStatus: "ACTIVE" },
      });

      const role = roleName.toLowerCase();

      if (role === "owner") {
        // OwnerProfile requires business location
        if (!ownerLocation) {
          throw new Error("Business location is required for owner registration");
        }
        await tx.ownerProfile.create({
          data: {
            userId,
            businessLat: ownerLocation.businessLat,
            businessLng: ownerLocation.businessLng,
          },
        });
      } else if (role === "customer") {
        await tx.customerProfile.create({
          data: { userId },
        });
      }
      // Technician role — no profile table in current schema, extend later

      return user;
    });
  }
}