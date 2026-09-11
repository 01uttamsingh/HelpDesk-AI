import * as Sentry from "@sentry/node";
import { env } from "./env";

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    console.log("ℹ️ Sentry DSN not configured. Error monitoring is disabled for server.");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV || "development",
    tracesSampleRate: 1.0,
  });

  console.log(`🛡️ Sentry initialized for Backend (${env.NODE_ENV || "development"})`);
}

export { Sentry };
