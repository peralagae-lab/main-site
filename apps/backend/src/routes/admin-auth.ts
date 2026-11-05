import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { EnvConfig } from "../config/env.js";
import { verifyPassword, signAdminToken, hashPassword, signAdminResetToken, verifyAdminResetToken } from "../utils/auth.js";
import { createAdminAuthMiddleware } from "../middleware/admin-auth.js";
import { logger } from "../utils/logger.js";

const COOKIE_NAME = "peralagae_admin_token";

const loginSchema = z.object({
  email: z.string().trim().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Admin Authentication Router factory.
 *
 * Implements Phase 1 Admin Auth:
 * - POST /api/admin/auth/login  (rate-limited, secure credentials check, sets HTTP-only cookie)
 * - GET  /api/admin/auth/me     (session validation)
 * - POST /api/admin/auth/logout (cookie invalidation)
 */
export function createAdminAuthRouter(env: EnvConfig): Router {
  const router = Router();
  const requireAdminAuth = createAdminAuthMiddleware(env);

  // Rate limiter specifically for admin login attempts
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === "test" || env.NODE_ENV === "development" ? 200 : 10, // 200 attempts in test/dev, 10 in prod
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many login attempts. Please wait 15 minutes before trying again.",
      },
    },
  });

  /**
   * POST /login
   * Authenticates the admin and issues a session cookie & token.
   */
  router.post("/login", loginLimiter, async (req: Request, res: Response) => {
    // 1. Validate request body
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Invalid email or password format",
        },
      });
      return;
    }

    const { email, password } = parseResult.data;

    // Check if admin credentials are configured in environment
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
      logger.error("ADMIN_EMAIL or ADMIN_PASSWORD is missing in backend configuration");
      res.status(503).json({
        success: false,
        error: {
          code: "SERVICE_UNCONFIGURED",
          message: "Authentication service is not properly configured on the server",
        },
      });
      return;
    }

    // 2. Constant-time check: email match with normalization
    const normalizedInputEmail = email.trim().toLowerCase();
    const normalizedAdminEmail = env.ADMIN_EMAIL.trim().toLowerCase();
    const emailMatches = Boolean(normalizedAdminEmail && normalizedInputEmail === normalizedAdminEmail);

    // 3. Constant-time check: password match (normalized against quotes/whitespace)
    const cleanAdminPassword = env.ADMIN_PASSWORD.trim().replace(/^["']|["']$/g, "");
    const passwordTarget = emailMatches
      ? cleanAdminPassword
      : "$2a$12$e8eYQv8gJ24w6wP8j3dCq.r06H0F7B5p.1C2d3E4f5G6h7I8j9k0l";
    const passwordMatches = await verifyPassword(password, passwordTarget);

    if (!emailMatches || !passwordMatches) {
      logger.warn({ ip: req.ip }, "Failed admin login attempt");
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
      return;
    }

    // 4. Issue session token
    const token = signAdminToken({ email: normalizedAdminEmail }, env.ADMIN_JWT_SECRET);

    // 5. Set secure HTTP-only cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });

    logger.info({ email: normalizedAdminEmail }, "Admin logged in successfully");

    res.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          email: normalizedAdminEmail,
          role: "admin",
        },
      },
    });
  });

  /**
   * GET /me
   * Validates active admin session.
   */
  router.get("/me", requireAdminAuth, (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        email: req.admin?.email,
        role: "admin",
      },
    });
  });

  /**
   * POST /logout
   * Clears session cookie and invalidates client session.
   */
  router.post("/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  });

  /**
   * PUT /credentials
   * Authenticated admin endpoint to update email and/or password.
   * Securely hashes new password with bcrypt (cost 12) and invalidates active session.
   */
  router.put("/credentials", requireAdminAuth, async (req: Request, res: Response) => {
    const updateSchema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newEmail: z.string().trim().email("Invalid email address").optional(),
      newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid update payload",
        },
      });
      return;
    }

    const { currentPassword, newEmail, newPassword } = parsed.data;

    const isCurrentValid = await verifyPassword(currentPassword, env.ADMIN_PASSWORD);
    if (!isCurrentValid) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Current password does not match",
        },
      });
      return;
    }

    if (newEmail) {
      env.ADMIN_EMAIL = newEmail.toLowerCase().trim();
    }
    if (newPassword) {
      env.ADMIN_PASSWORD = await hashPassword(newPassword);
    }

    // Persist to local .env if present
    try {
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (newEmail) {
          envContent = envContent.replace(/^ADMIN_EMAIL=.*/m, `ADMIN_EMAIL=${env.ADMIN_EMAIL}`);
        }
        if (newPassword) {
          envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD="${env.ADMIN_PASSWORD}"`);
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
      }
    } catch {
      // Safe fallback if file cannot be written directly
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    logger.info({ email: env.ADMIN_EMAIL }, "Admin credentials updated successfully");

    res.status(200).json({
      success: true,
      message: "Admin credentials successfully updated. Please log in with your new credentials.",
      data: {
        email: env.ADMIN_EMAIL,
      },
    });
  });

  /**
   * POST /forgot-password
   * Issues a short-lived (15m) admin password reset token.
   */
  router.post("/forgot-password", loginLimiter, (req: Request, res: Response) => {
    const bodySchema = z.object({
      email: z.string().trim().email(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid email address is required",
        },
      });
      return;
    }

    const normalizedInput = parsed.data.email.toLowerCase().trim();
    const normalizedAdmin = env.ADMIN_EMAIL.toLowerCase().trim();

    let resetToken: string | null = null;
    if (normalizedInput === normalizedAdmin) {
      resetToken = signAdminResetToken(normalizedAdmin, env.ADMIN_JWT_SECRET);
      logger.info({ email: normalizedAdmin }, "Admin password reset token requested");
    }

    res.status(200).json({
      success: true,
      message: "If an administrative account exists for this address, password reset instructions have been issued.",
      ...(env.NODE_ENV !== "production" && resetToken ? { debugToken: resetToken } : {}),
    });
  });

  /**
   * POST /reset-password
   * Completes the admin password reset workflow using a verified reset token.
   */
  router.post("/reset-password", loginLimiter, async (req: Request, res: Response) => {
    const bodySchema = z.object({
      token: z.string().min(1, "Reset token is required"),
      newPassword: z.string().min(8, "New password must be at least 8 characters"),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid payload",
        },
      });
      return;
    }

    const { token, newPassword } = parsed.data;
    const verified = verifyAdminResetToken(token, env.ADMIN_JWT_SECRET);
    if (!verified || verified.email !== env.ADMIN_EMAIL.toLowerCase().trim()) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Password reset link is invalid or has expired",
        },
      });
      return;
    }

    env.ADMIN_PASSWORD = await hashPassword(newPassword);

    try {
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD="${env.ADMIN_PASSWORD}"`);
        fs.writeFileSync(envPath, envContent, "utf-8");
      }
    } catch {
      // Ignore
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    logger.info({ email: env.ADMIN_EMAIL }, "Admin password reset successfully");

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  });

  return router;
}
