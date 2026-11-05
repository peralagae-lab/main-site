import { z } from "zod";

/**
 * Environment variable schema and validation using Zod.
 *
 * Requirements:
 * - Centralized environment validation
 * - Clear, safe configuration error messages
 * - Distinct rules for development, test, and production
 * - No sensitive credentials hardcoded or exposed in logs
 */

const DEFAULT_DEV_ADMIN_PASSWORD = "PeralagaeAdmin2026!SecureKey";
const DEFAULT_DEV_JWT_SECRET =
  "peralagae_super_secure_admin_jwt_secret_at_least_32_characters_long";
const DEFAULT_DEV_CUSTOMER_JWT_SECRET =
  "peralagae_super_secure_customer_jwt_secret_at_least_32_characters_long";

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .default("4000")
    .transform((val, ctx) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PORT must be an integer between 1 and 65535",
        });
        return z.NEVER;
      }
      return parsed;
    }),
  DATABASE_URL: z.string().optional().default(""),
  MONGODB_URI: z.string().optional().default(""),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,https://pera-ecom.netlify.app")
    .transform((val) =>
      val
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // ── Admin Authentication (Phase 1) ──────────────────────────────────────────
  ADMIN_EMAIL: z
    .string()
    .default("peralagae@gmail.com")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "").toLowerCase())
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "ADMIN_EMAIL must be a valid email",
    }),
  ADMIN_PASSWORD: z
    .string()
    .default(DEFAULT_DEV_ADMIN_PASSWORD)
    .transform((val) => val.trim().replace(/^["']|["']$/g, ""))
    .refine((val) => val.length >= 8, {
      message: "ADMIN_PASSWORD must be at least 8 characters",
    }),
  ADMIN_JWT_SECRET: z
    .string()
    .default(DEFAULT_DEV_JWT_SECRET)
    .transform((val) => val.trim().replace(/^["']|["']$/g, ""))
    .refine((val) => val.length >= 32, {
      message: "ADMIN_JWT_SECRET must be at least 32 characters",
    }),

  // ── Customer Authentication & Google OAuth ──────────────────────────────────
  CUSTOMER_JWT_SECRET: z
    .string()
    .default(DEFAULT_DEV_CUSTOMER_JWT_SECRET)
    .transform((val) => val.trim().replace(/^["']|["']$/g, ""))
    .refine((val) => val.length >= 32, {
      message: "CUSTOMER_JWT_SECRET must be at least 32 characters",
    }),
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .default("")
    .transform((val) => (val ? val.trim().replace(/^["']|["']$/g, "") : "")),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .default("")
    .transform((val) => (val ? val.trim().replace(/^["']|["']$/g, "") : "")),

  // ── Razorpay Payment Gateway Configuration ──────────────────────────────────
  RAZORPAY_KEY_ID: z
    .string()
    .default("rzp_test_placeholder")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  RAZORPAY_KEY_SECRET: z
    .string()
    .default("placeholder_secret")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .default("placeholder_webhook_secret")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  RAZORPAY_MODE: z.enum(["test", "live"]).default("test"),
  FRONTEND_URL: z
    .string()
    .default("http://localhost:3000")
    .transform((val) => val.trim().replace(/\/+$/, "")),

  // ── Email Notification System (SMTP via Nodemailer) ───────────────────────
  SMTP_HOST: z
    .string()
    .optional()
    .default("")
    .transform((val) => (val ? val.trim().replace(/^["']|["']$/g, "") : "")),
  SMTP_PORT: z
    .union([z.number(), z.string()])
    .default(587)
    .transform((val) => Number(val) || 587),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .default(false)
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val.trim().toLowerCase() === "true" || val.trim() === "1";
    }),
  SMTP_USER: z
    .string()
    .optional()
    .default("")
    .transform((val) => (val ? val.trim().replace(/^["']|["']$/g, "") : "")),
  SMTP_PASS: z
    .string()
    .optional()
    .default("")
    .transform((val) => (val ? val.trim().replace(/^["']|["']$/g, "") : "")),
  EMAIL_FROM: z
    .string()
    .default("notifications@peralagae.com")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  EMAIL_FROM_NAME: z
    .string()
    .default("PERALAGAE Jewellery")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  EMAIL_REPLY_TO: z
    .string()
    .default("support@peralagae.com")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  EMAIL_ENABLED: z
    .union([z.boolean(), z.string()])
    .default(true)
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val.trim().toLowerCase() === "true" || val.trim() === "1";
    }),
  BUSINESS_TIMEZONE: z.string().default("Asia/Kolkata"),
});

export const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    // MONGODB_URI is required in production
    const mongoUri = data.MONGODB_URI || data.DATABASE_URL;
    if (!mongoUri || mongoUri.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MONGODB_URI"],
        message: "MONGODB_URI is required in production environment",
      });
    } else if (
      !mongoUri.startsWith("mongodb://") &&
      !mongoUri.startsWith("mongodb+srv://")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MONGODB_URI"],
        message: "MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)",
      });
    }

    // CORS_ORIGINS must not allow wildcard in production
    if (data.CORS_ORIGINS.includes("*")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "Wildcard CORS origin '*' is not permitted in production",
      });
    }

    // Admin secrets must not use insecure development defaults in production
    if (data.ADMIN_PASSWORD === DEFAULT_DEV_ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_PASSWORD"],
        message: "ADMIN_PASSWORD must be changed from the development default in production",
      });
    }

    if (data.ADMIN_JWT_SECRET === DEFAULT_DEV_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_JWT_SECRET"],
        message: "ADMIN_JWT_SECRET must be changed from the development default in production",
      });
    }

    if (data.CUSTOMER_JWT_SECRET === DEFAULT_DEV_CUSTOMER_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CUSTOMER_JWT_SECRET"],
        message: "CUSTOMER_JWT_SECRET must be changed from the development default in production",
      });
    }
  }
});

export type EnvConfig = z.output<typeof baseEnvSchema>;

/**
 * Validates environment variables.
 * Accepts optional explicit dictionary (useful for isolated unit testing).
 * Defaults to process.env.
 */
export function validateEnv(source: Record<string, string | undefined> = process.env): EnvConfig {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("\n");

    const message = `[config] Configuration validation failed:\n${errorDetails}`;
    if (process.env["NODE_ENV"] !== "test") {
      console.error(message);
    }
    throw new Error(message);
  }

  return result.data;
}
