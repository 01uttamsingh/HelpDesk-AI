import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User Editing - Conflicts, Password Retention & Security", () => {
  test.describe("1. Email Conflict Handling", () => {
    test("displays server error alert when attempting to change to already existing email", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      // Attempt to edit agent with admin's email
      const table = page.getByTestId("users-table");
      const agentRow = table.locator("tbody tr", { hasText: TEST_USERS.agent.email });
      await agentRow.getByRole("button", { name: /edit/i }).click();

      const emailInput = page.getByLabel("Email", { exact: true });
      await emailInput.fill(TEST_USERS.admin.email);

      const saveBtn = page.getByRole("button", { name: /save changes/i });
      await saveBtn.click();

      await expect(
        page.getByText("A user with this email already exists")
      ).toBeVisible();

      await page.getByRole("button", { name: /cancel/i }).click();
      await signOutViaUI(page);
    });
  });

  test.describe("2. Password Preservation", () => {
    test("edits name without modifying password and preserves original password login", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");

      const targetUser = {
        name: "Preserve Password Agent",
        email: `preserve-${Date.now()}@example.com`,
        password: "OriginalPassword123",
      };
      const createRes = await page.request.post("/api/users", { data: targetUser });
      expect(createRes.status()).toBe(201);

      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: targetUser.email });
      await userRow.getByRole("button", { name: /edit/i }).click();

      const nameInput = page.getByLabel("Name", { exact: true });
      await nameInput.fill("Preserve Password Updated");

      const [response] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes("/api/users/") &&
            res.request().method() === "PATCH" &&
            res.status() === 200
        ),
        page.getByRole("button", { name: /save changes/i }).click(),
      ]);

      expect(response.ok()).toBe(true);
      await expect(page.getByRole("heading", { name: "Edit User" })).not.toBeVisible();

      await signOutViaUI(page);

      // User logs in with original password (proves password was preserved!)
      await loginViaUI(page, targetUser.email, targetUser.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      await signOutViaUI(page);
    });
  });

  test.describe("3. PATCH /api/users/:id API Security Boundaries", () => {
    test("rejects unauthenticated PATCH /api/users/:id with 401 Unauthorized", async ({
      request,
    }) => {
      const res = await request.patch("/api/users/any-user-id", {
        data: {
          name: "Hacker",
          email: "hacker@example.com",
        },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    });

    test("rejects Agent user PATCH /api/users/:id with 403 Forbidden", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
      await expect(page).toHaveURL("/");

      const res = await page.request.patch("/api/users/any-user-id", {
        data: {
          name: "Agent Override",
          email: "override@example.com",
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
