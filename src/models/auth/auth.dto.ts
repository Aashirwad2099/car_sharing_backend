import { z } from "zod";

const phoneSchema = z
  .string( "Phone number is required" )
  .regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian phone number (+91XXXXXXXXXX)");

const otpSchema = z
  .string("OTP is required" )
  .length(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only digits");

const passwordSchema = z
  .string("Password is required" )
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password too long")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/\d/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

// ─── Registration ─────────────────────────────────────────

export const InitiateRegisterDto = z.object({
  name: z
    .string("Name is required" )
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .trim(),
  phone: phoneSchema,
  roleId: z.number("Role is required" ).int().positive("Invalid role"),
});

export const VerifyOtpDto = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

export const CompleteRegisterDto = z
  .object({
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string( "Please confirm your password" ),

    // Required only for owner role — validated conditionally below
    businessLat: z.number().min(-90).max(90).optional(),
    businessLng: z.number().min(-180).max(180).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
  // Note: owner businessLat/Lng presence is validated in the service
  // after we know the user's role — DTO stays clean

// ─── Resend OTP ───────────────────────────────────────────

export const ResendOtpDto = z.object({
  phone: phoneSchema,
});

// ─── Login ────────────────────────────────────────────────

export const LoginDto = z.object({
  phone: phoneSchema,
  password: z.string("Password is required" ).min(1),
});

// ─── Forgot Password ──────────────────────────────────────

export const ForgotPasswordDto = z.object({
  phone: phoneSchema,
});

export const VerifyForgotPasswordOtpDto = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

export const ResetPasswordDto = z
  .object({
    phone: phoneSchema,
    resetToken: z.string( "Reset token is required" ).min(1),
    password: passwordSchema,
    confirmPassword: z.string(  "Please confirm your password" ),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Inferred Types ───────────────────────────────────────

export type InitiateRegisterInput        = z.infer<typeof InitiateRegisterDto>;
export type VerifyOtpInput               = z.infer<typeof VerifyOtpDto>;
export type CompleteRegisterInput        = z.infer<typeof CompleteRegisterDto>;
export type ResendOtpInput               = z.infer<typeof ResendOtpDto>;
export type LoginInput                   = z.infer<typeof LoginDto>;
export type ForgotPasswordInput          = z.infer<typeof ForgotPasswordDto>;
export type VerifyForgotPasswordOtpInput = z.infer<typeof VerifyForgotPasswordOtpDto>;
export type ResetPasswordInput           = z.infer<typeof ResetPasswordDto>;