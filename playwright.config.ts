import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prioritize test environment variables
dotenv.config({ path: path.resolve(__dirname, ".env.test"), override: true });
dotenv.config({ path: path.resolve(__dirname, "server/.env.test"), override: true });

const SERVER_PORT = process.env.PORT || "5001";
const CLIENT_PORT = process.env.VITE_PORT || "5174";
const BASE_URL = `http://localhost:${CLIENT_PORT}`;
const API_URL = `http://localhost:${SERVER_PORT}`;
const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5433/helpdesk_test?schema=public";

export default defineConfig({
  testDir: "./e2e",
  // Database-backed integration/E2E tests share test database state, run sequentially
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run test:server",
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: "test",
        PORT: SERVER_PORT,
        CLIENT_URL: BASE_URL,
        TRUSTED_ORIGINS: BASE_URL,
        DATABASE_URL: TEST_DB_URL,
        BETTER_AUTH_URL: API_URL,
      },
    },
    {
      command: "bun run test:client",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        PORT: CLIENT_PORT,
        VITE_PORT: CLIENT_PORT,
        API_URL: API_URL,
        VITE_API_URL: API_URL,
      },
    },
  ],
});
