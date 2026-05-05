import type { Request, Response, NextFunction } from "express";
import { JwtUtil, type JwtPayload } from "../shared/utils/jwt.utils.js";
import { UnauthorizedError, ForbiddenError } from "../shared/errors/HttpError.js";
import { AuthErrorCode } from "../models/auth/auth.error.js";
import { prisma } from "../config/database.js";

// ─── Extend Express Request ────────────────────────────────
// Attach decoded JWT payload so downstream handlers can read it
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        roleId: number;
        roleName: string;
      };
    }
  }
}

// ─── authenticate ──────────────────────────────────────────
/**
 * Verifies the Bearer token from Authorization header.
 * Attaches decoded user info to req.user.
 *
 * Usage:
 *   router.get("/profile", authenticate, controller.getProfile);
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      throw new UnauthorizedError(
        "Access token is required",
        AuthErrorCode.TOKEN_INVALID
      );
    }

    // Verify signature and expiry
    let payload: JwtPayload;
    try {
      payload = JwtUtil.verify(token);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message === "jwt expired"
          ? "Access token has expired"
          : "Invalid access token";

      const code =
        err instanceof Error && err.message === "jwt expired"
          ? AuthErrorCode.TOKEN_EXPIRED
          : AuthErrorCode.TOKEN_INVALID;

      throw new UnauthorizedError(message, code);
    }

    // Must be an access token — reject refresh tokens used as access tokens
    if (payload.type !== "access") {
      throw new UnauthorizedError(
        "Invalid token type",
        AuthErrorCode.TOKEN_INVALID
      );
    }

    // Verify user still exists and account is active
    // This catches: deleted accounts, suspended accounts after token issuance
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phone: true,
        roleId: true,
        accountStatus: true,
        role: { select: { name: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError(
        "Account not found",
        AuthErrorCode.ACCOUNT_NOT_FOUND
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      throw new ForbiddenError(
        "Your account has been suspended",
        AuthErrorCode.ACCOUNT_SUSPENDED
      );
    }

    if (user.accountStatus !== "ACTIVE") {
      throw new UnauthorizedError(
        "Account is not active",
        AuthErrorCode.ACCOUNT_NOT_FOUND
      );
    }

    // Attach to request for use in controllers
    req.user = {
      id: user.id,
      phone: user.phone,
      roleId: user.roleId,
      roleName: user.role.name,
    };

    next();
  } catch (err) {
    next(err);
  }
};

// ─── authorizeRoles ────────────────────────────────────────
/**
 * Role-based access control. Must be used AFTER authenticate.
 *
 * Usage:
 *   router.get("/admin", authenticate, authorizeRoles("admin"), controller.handler);
 *   router.get("/cars",  authenticate, authorizeRoles("renter", "admin"), controller.handler);
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new UnauthorizedError("Not authenticated", AuthErrorCode.TOKEN_INVALID)
      );
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`,
          "AUTH_INSUFFICIENT_ROLE"
        )
      );
    }

    next();
  };
};

// ─── optionalAuthenticate ──────────────────────────────────
/**
 * Like authenticate but does NOT fail if no token is provided.
 * req.user will be undefined for unauthenticated requests.
 *
 * Usage: public endpoints that behave differently when logged in
 *   router.get("/listings", optionalAuthenticate, controller.getListings);
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) return next(); // no token — continue as guest

    let payload: JwtPayload;
    try {
      payload = JwtUtil.verify(token);
    } catch {
      return next(); // invalid token — treat as guest, don't error
    }

    if (payload.type !== "access") return next();

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phone: true,
        roleId: true,
        accountStatus: true,
        role: { select: { name: true } },
      },
    });

    if (user && user.accountStatus === "ACTIVE") {
      req.user = {
        id: user.id,
        phone: user.phone,
        roleId: user.roleId,
        roleName: user.role.name,
      };
    }

    next();
  } catch {
    next(); // never block the request in optional mode
  }
};

// ─── Helper ────────────────────────────────────────────────

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}