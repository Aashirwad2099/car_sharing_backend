import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface JwtPayload {
  sub: string;
  phone: string;
  roleId: number;
  type: "access" | "refresh";
}

const ACCESS_TOKEN_EXPIRY  = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";

const signOptions = (expiresIn: SignOptions["expiresIn"]): SignOptions => ({
  expiresIn,
});

export class JwtUtil {
  static signAccessToken(payload: Omit<JwtPayload, "type">): string {
    return jwt.sign(
      { ...payload, type: "access" },
      env.JWT_SECRET,
      signOptions(ACCESS_TOKEN_EXPIRY)
    );
  }

  static signRefreshToken(payload: Omit<JwtPayload, "type">): string {
    return jwt.sign(
      { ...payload, type: "refresh" },
      env.JWT_SECRET,
      signOptions(REFRESH_TOKEN_EXPIRY)
    );
  }

  static verify(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }

  static getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
}