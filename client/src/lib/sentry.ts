import * as Sentry from "@sentry/react";

export function initFrontendSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENV || "development";

  if (!dsn) {
    console.log("ℹ️ Sentry DSN not configured. Error monitoring is disabled for client.");
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Capture 100% of transactions for performance tracing
    tracesSampleRate: 1.0,
  });

  console.log(`🛡️ Sentry initialized for Frontend (${environment})`);
}

export { Sentry };
