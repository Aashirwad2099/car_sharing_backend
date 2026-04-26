// src/dtos/auth.dto.ts
import { z } from "zod";

// ─── Step 1: Initiate Registration ───────────────────────
// POST /auth/register/initiate
// User submits name + phone → we send OTP
export const InitiateRegisterDto = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .trim()
    .refine((val) => val.length > 0, { message: "Name is required" }),

  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian phone number (+91XXXXXXXXXX)")
    .refine((val) => val.length > 0, { message: "Phone number is required" }),

  roleId: z
    .number()
    .int()
    .positive("Invalid role")
    .refine((val) => val !== undefined, { message: "Role is required" }),
});

// ─── Step 2: Verify OTP ──────────────────────────────────
// POST /auth/register/verify-otp
// User submits phone + OTP → we mark phone verified
export const VerifyOtpDto = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian phone number")
    .refine((val) => val.length > 0, { message: "Phone number is required" }),

  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits")
    .refine((val) => val.length > 0, { message: "OTP is required" }),
});

// ─── Step 3: Complete Registration ───────────────────────
// POST /auth/register/complete
// User sets password after phone is verified
export const CompleteRegisterDto = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian phone number")
    .refine((val) => val.length > 0, { message: "Phone number is required" }),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long") // bcrypt max
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
    .refine((val) => val.length > 0, { message: "Password is required" }),

  confirmPassword: z.string().refine((val) => val.length > 0, { message: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});



export const LoginDto = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian phone number (+91XXXXXXXXXX)")
    .min(1, "Phone number is required"),

  password: z
    .string()
    .min(1, "Password is required"),
});
 
// ─── Inferred Types ───────────────────────────────────────

// ─── Inferred Types ───────────────────────────────────────
export type InitiateRegisterInput = z.infer<typeof InitiateRegisterDto>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpDto>;
export type CompleteRegisterInput = z.infer<typeof CompleteRegisterDto>;
// export type VerifyOtpInput        = z.infer<typeof VerifyOtpDto>;
export type LoginInput = z.infer<typeof LoginDto>;
