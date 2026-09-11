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

const envSchema = z.object({
  PORT: z
    .string()
    .default("5000")
    .transform((val) => {
      const parsed = parseInt(val, 10);
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
  BETTER_AUTH_URL: z
    .string()
    .url("BETTER_AUTH_URL must be a valid URL")
    .default("http://localhost:5000"),
  CLIENT_URL: z
    .string()
    .url("CLIENT_URL must be a valid URL")
    .default("http://localhost:5173"),
  TRUSTED_ORIGINS: z.string().optional(),
  SUPPORT_EMAIL: z.string().email().default("support@helpdesk.local"),
  OPENAI_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional().default("smtp.gmail.com"),
  SMTP_PORT: z
    .string()
    .optional()
    .default("465")
    .transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true"),
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

  return result.data;
}

export const env = validateEnv();

export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  if (env.CLIENT_URL) {
    origins.add(env.CLIENT_URL.trim());
  }

  if (env.TRUSTED_ORIGINS) {
    env.TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => origins.add(origin));
  }

  return Array.from(origins);
}
