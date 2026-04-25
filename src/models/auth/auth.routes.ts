import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  InitiateRegisterDto,
  VerifyOtpDto,
  CompleteRegisterDto,
} from "./auth.dto.js";

const router = Router();
const authController = new AuthController();

/**
 * Registration Flow (3-step phone OTP):
 *
 *  1. POST /auth/register/initiate   → send OTP
 *  2. POST /auth/register/verify-otp → verify OTP
 *  3. POST /auth/register/complete   → set password, activate account
 */
router.post(
  "/register/initiate",
  validate(InitiateRegisterDto),
  authController.initiateRegister
);

router.post(
  "/register/verify-otp",
  validate(VerifyOtpDto),
  authController.verifyOtp
);

router.post(
  "/register/complete",
  validate(CompleteRegisterDto),
  authController.completeRegister
);

export default router;