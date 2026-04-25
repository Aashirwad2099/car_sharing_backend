// import { env } from "../../config/env.js";

// interface SendOtpResult {
//   success: boolean;
//   requestId?: string; // MSG91 returns this for tracking
// }

// export class SmsService {
//   private static readonly BASE_URL = "https://api.msg91.com/api/v5";

//   /**
//    * Send OTP via MSG91 in production.
//    * In dev, just logs to console — no API call made.
//    */
//   static async sendOtp(phone: string, otp: string): Promise<SendOtpResult> {
//     if (!env.isProd) {
//       // ─── DEV MODE: Console mock ──────────────────────────
//       console.log("─────────────────────────────────────");
//       console.log(`📱 [SMS MOCK] To: ${phone}`);
//       console.log(`🔑 [SMS MOCK] OTP: ${otp}`);
//       console.log("─────────────────────────────────────");
//       return { success: true, requestId: "dev-mock-request-id" };
//     }

//     // ─── PROD MODE: Real MSG91 call ──────────────────────
//     return SmsService.callMsg91(phone, otp);
//   }

//   private static async callMsg91(
//     phone: string,
//     otp: string
//   ): Promise<SendOtpResult> {
//     // MSG91 expects phone without +
//     const cleanPhone = phone.replace("+", "");

//     const payload = {
//       template_id: env.MSG91_TEMPLATE_ID,
//       mobile: cleanPhone,
//       authkey: env.MSG91_AUTH_KEY,
//       otp,
//     };

//     const response = await fetch(`${SmsService.BASE_URL}/otp`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) {
//       const error = await response.text();
//       console.error("MSG91 API error:", error);
//       throw new Error(`SMS delivery failed: ${error}`);
//     }

//     const data = (await response.json()) as { type: string; request_id: string };

//     return {
//       success: data.type === "success",
//       requestId: data.request_id,
//     };
//   }
// }