import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  InitiateRegisterDto,
  VerifyOtpDto,
  CompleteRegisterDto,
  ResendOtpDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyForgotPasswordOtpDto,
  ResetPasswordDto,
} from "./auth.dto.js";

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication — registration, login, password reset
 */

// ─── Registration ──────────────────────────────────────────

/**
 * @swagger
 * /auth/register/initiate:
 *   post:
 *     summary: Step 1 — Initiate registration
 *     description: Creates a PENDING user and sends OTP to phone. In dev, OTP is returned in `_devOtp`.
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
 *         description: OTP sent
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
 *         description: Phone already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/register/initiate", validate(InitiateRegisterDto), authController.initiateRegister);

/**
 * @swagger
 * /auth/register/resend-otp:
 *   post:
 *     summary: Resend registration OTP
 *     description: |
 *       Resends OTP to the phone number. A 60-second cooldown is enforced
 *       between resend requests. Old OTPs are invalidated.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOtpRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InitiateRegisterResponse'
 *       404:
 *         description: Phone not registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Resend cooldown active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Please wait 45 second(s) before requesting a new OTP."
 *               code: "AUTH_OTP_RESEND_TOO_SOON"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/register/resend-otp", validate(ResendOtpDto), authController.resendOtp);

/**
 * @swagger
 * /auth/register/verify-otp:
 *   post:
 *     summary: Step 2 — Verify registration OTP
 *     description: Verifies OTP and marks phone as verified. Max 5 attempts. Expires in 10 min.
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
 *         description: Phone verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
 *         description: Max attempts exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/register/verify-otp", validate(VerifyOtpDto), authController.verifyOtp);

/**
 * @swagger
 * /auth/register/complete:
 *   post:
 *     summary: Step 3 — Complete registration
 *     description: Sets password and activates account. Phone must be verified first.
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
 *       400:
 *         description: Phone not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/register/complete", validate(CompleteRegisterDto), authController.completeRegister);

// ─── Login ─────────────────────────────────────────────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with phone + password
 *     description: Returns access token (15 min) and refresh token (30 days). No OTP required.
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
 *       403:
 *         description: Account pending or suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *     summary: Rotate refresh token
 *     description: |
 *       Exchanges a valid refresh token for a new access + refresh token pair.
 *       Old token is immediately revoked. Reuse of revoked token wipes all sessions.
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
 *         description: Invalid, expired, or revoked token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/refresh", authController.refreshTokens);

// ─── Forgot Password ───────────────────────────────────────

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Step 1 — Request password reset OTP
 *     description: |
 *       Sends OTP to the registered phone. Always returns the same message
 *       whether phone exists or not (prevents user enumeration).
 *       60-second cooldown between requests.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: OTP sent (same response regardless of phone existence)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InitiateRegisterResponse'
 *       429:
 *         description: Resend cooldown active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/forgot-password", validate(ForgotPasswordDto), authController.forgotPassword);

/**
 * @swagger
 * /auth/forgot-password/verify-otp:
 *   post:
 *     summary: Step 2 — Verify password reset OTP
 *     description: |
 *       Verifies the OTP. On success returns a short-lived `resetToken` (15 min)
 *       which must be submitted in Step 3 to set the new password.
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
 *         description: OTP verified — reset token issued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/VerifyForgotOtpResponse'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Max attempts exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/forgot-password/verify-otp", validate(VerifyForgotPasswordOtpDto), authController.verifyForgotPasswordOtp);

/**
 * @swagger
 * /auth/forgot-password/reset:
 *   post:
 *     summary: Step 3 — Set new password
 *     description: |
 *       Sets a new password using the `resetToken` from Step 2. On success,
 *       all active sessions are revoked and user must log in again.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid, used, or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid:
 *                 value:
 *                   success: false
 *                   message: "Invalid reset token"
 *                   code: "AUTH_RESET_TOKEN_INVALID"
 *               used:
 *                 value:
 *                   success: false
 *                   message: "Reset token has already been used."
 *                   code: "AUTH_RESET_TOKEN_USED"
 *               expired:
 *                 value:
 *                   success: false
 *                   message: "Reset token has expired."
 *                   code: "AUTH_RESET_TOKEN_EXPIRED"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/forgot-password/reset", validate(ResetPasswordDto), authController.resetPassword);

export default router;