import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("Authentication - Session, Sign Out & Route Guards", () => {
  test.describe("5. Session Persistence", () => {
    test("retains authentication state after page reload", async ({ page }) => {
      await loginViaUI(page);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      // Reload page
      await page.reload();

      // Verify user is still authenticated
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await expect(page.locator("header").getByText(TEST_USERS.admin.name)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: new RegExp(`welcome, ${TEST_USERS.admin.name}!`, "i") })
      ).toBeVisible();

      await signOutViaUI(page);
    });
  });

  test.describe("6. Sign Out Flow", () => {
    test("terminates session, redirects to /login, and blocks subsequent / navigation", async ({
      page,
    }) => {
      await loginViaUI(page);
      await expect(page).toHaveURL("/");

      // Click sign out
      await signOutViaUI(page);

      // Verify redirected to /login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText(/sign in to helpdesk/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();

      // Subsequent attempt to visit protected home route
      await page.goto("/");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("7. Protected Route & Auth Guards", () => {
    test("redirects unauthenticated visitor from / to /login", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText(/sign in to helpdesk/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    });

    test("redirects unauthenticated visitor from /users to /login", async ({ page }) => {
      await page.goto("/users");
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText(/sign in to helpdesk/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    });
  });

  test.describe("8. Already-Authenticated Redirect", () => {
    test("redirects authenticated user from /login back to home page", async ({ page }) => {
      await loginViaUI(page);
      await expect(page).toHaveURL("/");

      // Navigate directly to /login while authenticated
      await page.goto("/login");

      // Verify auto-redirected back to /
      await expect(page).toHaveURL("/");
      await expect(
        page.getByRole("heading", { name: new RegExp(`welcome, ${TEST_USERS.admin.name}!`, "i") })
      ).toBeVisible();

      await signOutViaUI(page);
    });
  });
});
