import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Prioritize test environment variables when NODE_ENV is test
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });
  dotenv.config({ path: path.resolve(process.cwd(), "server/.env.test"), override: true });
  dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env.test"), override: true });
  dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env.test"), override: true });
}

// Load .env files from both project root and server directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });

/**
 * Sanitizes and normalizes a URL string:
 * - Trims whitespace
 * - Ensures https:// or http:// protocol is present
 * - Strips trailing slashes
 * - Returns fallback if empty or not a string
 */
export function sanitizeUrl(val: unknown, fallback?: string): string | undefined {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  const withProtocol = !trimmed.startsWith("http://") && !trimmed.startsWith("https://")
    ? `https://${trimmed}`
    : trimmed;
  return withProtocol.replace(/\/+$/, "");
}

// Support Railway deployment public domain detection
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
const defaultPublicUrl = railwayDomain ? sanitizeUrl(railwayDomain) : undefined;

const envSchema = z.object({
  PORT: z
    .preprocess(
      (val) => (val === undefined || val === "" ? "5000" : val),
      z.union([z.string(), z.number()])
    )
    .transform((val) => {
      const parsed = typeof val === "number" ? val : parseInt(val, 10);
      if (isNaN(parsed)) {
        throw new Error("PORT must be a valid integer");
      }
      return parsed;
    }),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL cannot be empty"),
  BETTER_AUTH_SECRET: z
    .string({ required_error: "BETTER_AUTH_SECRET is required" })
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters long"),
  BETTER_AUTH_URL: z.preprocess(
    (val) => sanitizeUrl(val, defaultPublicUrl || "http://localhost:5000"),
    z.string().url("BETTER_AUTH_URL must be a valid URL")
  ),
  CLIENT_URL: z.preprocess(
    (val) => sanitizeUrl(val, defaultPublicUrl || "http://localhost:5173"),
    z.string().url("CLIENT_URL must be a valid URL")
  ),
  TRUSTED_ORIGINS: z.string().optional(),
  SUPPORT_EMAIL: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : "support@helpdesk.local"),
    z.string().email().default("support@helpdesk.local")
  ),
  OPENAI_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional().default("smtp.gmail.com"),
  SMTP_PORT: z
    .preprocess(
      (val) => (val === undefined || val === "" ? "465" : val),
      z.union([z.string(), z.number()])
    )
    .transform((val) => {
      const parsed = typeof val === "number" ? val : parseInt(val, 10);
      return isNaN(parsed) ? 465 : parsed;
    }),
  SMTP_SECURE: z
    .preprocess(
      (val) => (val === undefined || val === "" ? "true" : val),
      z.union([z.string(), z.boolean()])
    )
    .transform((val) => val === true || val === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment validation failed. Required variables are missing or invalid:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Startup halted due to invalid environment configuration.");
  }

  // Ensure process.env is synced with sanitized/defaulted values for libraries reading process.env directly
  process.env.BETTER_AUTH_URL = result.data.BETTER_AUTH_URL;
  process.env.CLIENT_URL = result.data.CLIENT_URL;
  process.env.PORT = String(result.data.PORT);

  return result.data;
}

export const env = validateEnv();

export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  if (env.CLIENT_URL) {
    origins.add(env.CLIENT_URL.trim().replace(/\/+$/, ""));
  }

  if (env.BETTER_AUTH_URL) {
    origins.add(env.BETTER_AUTH_URL.trim().replace(/\/+$/, ""));
  }

  const activeRailwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
  if (activeRailwayDomain) {
    const railwayUrl = sanitizeUrl(activeRailwayDomain);
    if (railwayUrl) {
      origins.add(railwayUrl);
    }
  }

  if (env.TRUSTED_ORIGINS) {
    env.TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean)
      .forEach((origin) => origins.add(origin));
  }

  return Array.from(origins);
}
