import type { OtpPurpose, User, OtpVerification, Role } from "@prisma/client";
import { prisma } from "../../config/database.js";

/**
 * AuthRepository — owns all DB queries for the auth domain.
 * No business logic here; only data access.
 */
export class AuthRepository {
  // ─── User ──────────────────────────────────────────────

  async findUserByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
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
      data: {
        passwordHash,
        accountStatus: "ACTIVE",
      },
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

  /**
   * Invalidate all previous unused OTPs for the same phone+purpose
   * before creating a new one — prevents OTP hoarding attacks.
   */
  async invalidatePreviousOtps(
    phone: string,
    purpose: OtpPurpose
  ): Promise<void> {
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

  /**
   * Find the most recent active (unused, non-expired) OTP for phone+purpose
   */
  async findActiveOtp(
    phone: string,
    purpose: OtpPurpose
  ): Promise<OtpVerification | null> {
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
}