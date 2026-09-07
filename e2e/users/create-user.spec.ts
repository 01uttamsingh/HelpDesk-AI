import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User Creation - Conflict & Security Boundaries", () => {
  test.describe("1. Duplicate Email Conflict Handling", () => {
    test("displays server error alert in modal when attempting to create duplicate email", async ({
      page,
    }) => {
      // 1. Admin logs in
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      // 2. Open Create User modal
      await page.getByRole("button", { name: /create user/i }).click();

      // 3. Attempt to create user with already existing Admin email
      await page.getByLabel("Name", { exact: true }).fill("Duplicate Test");
      await page.getByLabel("Email", { exact: true }).fill(TEST_USERS.admin.email);
      await page.getByLabel("Password", { exact: true }).fill("password123");

      await page.locator("form").getByRole("button", { name: /^create user$/i }).click();

      // 4. Verify destructive alert displays server conflict error
      await expect(
        page.getByText("A user with this email already exists")
      ).toBeVisible();

      // 5. Modal remains open so user can correct the input
      await expect(
        page.getByRole("heading", { name: "Create New User" })
      ).toBeVisible();

      await page.getByRole("button", { name: /cancel/i }).click();
      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: API Protection (RBAC)
  // ---------------------------------------------------------------------------
  test.describe("2. POST /api/users API Security Boundaries", () => {
    test("rejects unauthenticated POST /api/users with 401 Unauthorized", async ({
      request,
    }) => {
      const res = await request.post("/api/users", {
        data: {
          name: "Attacker",
          email: "attacker@example.com",
          password: "password123",
        },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    });

    test("rejects Agent user POST /api/users with 403 Forbidden", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
      await expect(page).toHaveURL("/");

      const res = await page.request.post("/api/users", {
        data: {
          name: "Agent Created User",
          email: "unauthorized@example.com",
          password: "password123",
        },
      });

      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Forbidden: ADMIN access required",
      });

      await signOutViaUI(page);
    });
  });
});
