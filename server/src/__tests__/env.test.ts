import { describe, it, expect } from "bun:test";
import { sanitizeUrl, validateEnv, getTrustedOrigins } from "../config/env";

describe("sanitizeUrl", () => {
  it("adds https:// when protocol is missing", () => {
    expect(sanitizeUrl("helpdesk-production.up.railway.app")).toBe(
      "https://helpdesk-production.up.railway.app"
    );
  });

  it("preserves http:// protocol if provided", () => {
    expect(sanitizeUrl("http://localhost:5000")).toBe("http://localhost:5000");
  });

  it("preserves https:// protocol if provided", () => {
    expect(sanitizeUrl("https://helpdesk.com")).toBe("https://helpdesk.com");
  });

  it("removes trailing slashes", () => {
    expect(sanitizeUrl("https://helpdesk-production.up.railway.app///")).toBe(
      "https://helpdesk-production.up.railway.app"
    );
    expect(sanitizeUrl("helpdesk-production.up.railway.app/")).toBe(
      "https://helpdesk-production.up.railway.app"
    );
  });

  it("returns fallback for empty string or whitespace", () => {
    expect(sanitizeUrl("", "http://localhost:5000")).toBe("http://localhost:5000");
    expect(sanitizeUrl("   ", "http://localhost:5000")).toBe("http://localhost:5000");
  });

  it("returns fallback for non-string types", () => {
    expect(sanitizeUrl(undefined, "http://localhost:5000")).toBe("http://localhost:5000");
    expect(sanitizeUrl(null, "http://localhost:5000")).toBe("http://localhost:5000");
    expect(sanitizeUrl(123, "http://localhost:5000")).toBe("http://localhost:5000");
  });
});

describe("env validation and trusted origins", () => {
  it("exports valid env and trusted origins in current environment", () => {
    const env = validateEnv();
    expect(env.PORT).toBeGreaterThan(0);
    expect(env.BETTER_AUTH_URL).toMatch(/^https?:\/\//);
    expect(env.CLIENT_URL).toMatch(/^https?:\/\//);

    const origins = getTrustedOrigins();
    expect(Array.isArray(origins)).toBe(true);
    for (const origin of origins) {
      expect(origin.endsWith("/")).toBe(false);
      expect(origin).toMatch(/^https?:\/\//);
    }
  });
});
