import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  InitiateRegisterDto,
  VerifyOtpDto,
  CompleteRegisterDto,
  LoginDto,
} from "./auth.dto.js";

const router = Router();
const authController = new AuthController();

// ─── Registration ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication — registration and login
 */

/**
 * @swagger
 * /auth/register/initiate:
 *   post:
 *     summary: Step 1 — Initiate registration
 *     description: |
 *       Creates a PENDING user account and sends a 6-digit OTP to the provided
 *       phone number via SMS. In development the OTP is returned in `_devOtp`.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InitiateRegisterRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InitiateRegisterResponse'
 *       409:
 *         description: Phone number already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Phone number already registered"
 *               code: "AUTH_PHONE_ALREADY_EXISTS"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
  "/register/initiate",
  validate(InitiateRegisterDto),
  authController.initiateRegister
);

/**
 * @swagger
 * /auth/register/verify-otp:
 *   post:
 *     summary: Step 2 — Verify OTP
 *     description: |
 *       Verifies the OTP sent to the user's phone. On success, marks the phone
 *       as verified. OTP expires in 10 minutes and allows max 5 attempts.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Phone verified successfully"
 *               data: { message: "Phone verified successfully" }
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               expired:
 *                 value:
 *                   success: false
 *                   message: "OTP not found or expired. Please request a new one."
 *                   code: "AUTH_OTP_EXPIRED"
 *               invalid:
 *                 value:
 *                   success: false
 *                   message: "Invalid OTP. 2 attempt(s) remaining."
 *                   code: "AUTH_OTP_INVALID"
 *       429:
 *         description: Max OTP attempts exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Maximum OTP attempts exceeded. Please request a new OTP."
 *               code: "AUTH_OTP_MAX_ATTEMPTS"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
  "/register/verify-otp",
  validate(VerifyOtpDto),
  authController.verifyOtp
);

/**
 * @swagger
 * /auth/register/complete:
 *   post:
 *     summary: Step 3 — Complete registration
 *     description: |
 *       Sets the user's password and activates the account. Phone must be
 *       verified (Step 2) before calling this endpoint.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteRegisterRequest'
 *     responses:
 *       201:
 *         description: Registration complete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Registration complete. You can now log in."
 *               data:
 *                 message: "Registration complete. You can now log in."
 *                 userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *       400:
 *         description: Phone not verified or passwords don't match
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Please verify your phone number before completing registration"
 *               code: "AUTH_PHONE_NOT_VERIFIED"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
  "/register/complete",
  validate(CompleteRegisterDto),
  authController.completeRegister
);

// ─── Login ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with phone + password
 *     description: |
 *       Authenticates a user with phone number and password. No OTP required.
 *       Returns a short-lived access token (15 min) and a long-lived refresh
 *       token (30 days). Max 5 concurrent sessions per user — oldest session
 *       is revoked when limit is reached.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid phone number or password"
 *               code: "AUTH_INVALID_CREDENTIALS"
 *       403:
 *         description: Account pending or suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               pending:
 *                 value:
 *                   success: false
 *                   message: "Account registration is incomplete."
 *                   code: "AUTH_ACCOUNT_PENDING"
 *               suspended:
 *                 value:
 *                   success: false
 *                   message: "Your account has been suspended."
 *                   code: "AUTH_ACCOUNT_SUSPENDED"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/login", validate(LoginDto), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: |
 *       Exchanges a valid refresh token for a new access + refresh token pair
 *       (token rotation). The old refresh token is invalidated immediately.
 *       If a revoked token is reused, all sessions for that user are wiped
 *       (theft detection).
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TokensResponse'
 *       401:
 *         description: Invalid, expired, or revoked refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid:
 *                 value:
 *                   success: false
 *                   message: "Invalid refresh token"
 *                   code: "AUTH_TOKEN_INVALID"
 *               expired:
 *                 value:
 *                   success: false
 *                   message: "Refresh token expired. Please log in again."
 *                   code: "AUTH_TOKEN_EXPIRED"
 *               revoked:
 *                 value:
 *                   success: false
 *                   message: "Refresh token has been revoked. Please log in again."
 *                   code: "AUTH_TOKEN_REVOKED"
 */
router.post("/refresh", authController.refreshTokens);

export default router;