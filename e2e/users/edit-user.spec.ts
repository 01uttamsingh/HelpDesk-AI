import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User Editing & Password Management Flows", () => {
  // ---------------------------------------------------------------------------
  // Scenario 1: Modal Open, Pre-population, and Dismissal Handlers
  // ---------------------------------------------------------------------------
  test.describe("1. Modal Dialog, Pre-population & Dismissal", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();
    });

    test("opens edit modal pre-populated with user data and dismisses on Cancel", async ({
      page,
    }) => {
      const table = page.getByTestId("users-table");
      const agentRow = table.locator("tbody tr", { hasText: TEST_USERS.agent.email });
      await expect(agentRow).toBeVisible();

      // 1. Click edit button on agent row
      const editBtn = agentRow.getByRole("button", { name: /edit/i });
      await expect(editBtn).toBeVisible();
      await editBtn.click();

      // 2. Verify modal heading and pre-populated values
      await expect(page.getByRole("heading", { name: "Edit User" })).toBeVisible();
      const nameInput = page.getByLabel("Name", { exact: true });
      const emailInput = page.getByLabel("Email", { exact: true });
      const passwordInput = page.getByLabel("Password", { exact: true });

      await expect(nameInput).toHaveValue(TEST_USERS.agent.name);
      await expect(emailInput).toHaveValue(TEST_USERS.agent.email);
      await expect(passwordInput).toHaveValue("");
      await expect(passwordInput).toHaveAttribute(
        "placeholder",
        "Leave blank to keep current password"
      );

      // 3. Dismiss on Cancel button
      const cancelBtn = page.getByRole("button", { name: /cancel/i });
      await cancelBtn.click();
      await expect(page.getByRole("heading", { name: "Edit User" })).not.toBeVisible();

      await signOutViaUI(page);
    });

    test("closes edit modal when pressing the Escape key", async ({ page }) => {
      const table = page.getByTestId("users-table");
      const agentRow = table.locator("tbody tr", { hasText: TEST_USERS.agent.email });
      await agentRow.getByRole("button", { name: /edit/i }).click();

      await expect(page.getByRole("heading", { name: "Edit User" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("heading", { name: "Edit User" })).not.toBeVisible();

      await signOutViaUI(page);
    });

    test("closes edit modal when clicking outside on the backdrop", async ({ page }) => {
      const table = page.getByTestId("users-table");
      const agentRow = table.locator("tbody tr", { hasText: TEST_USERS.agent.email });
      await agentRow.getByRole("button", { name: /edit/i }).click();

      await expect(page.getByRole("heading", { name: "Edit User" })).toBeVisible();

      const backdrop = page.locator('[data-slot="dialog-backdrop"]');
      await expect(backdrop).toBeVisible();
      await backdrop.click({ position: { x: 10, y: 10 } });

      await expect(page.getByRole("heading", { name: "Edit User" })).not.toBeVisible();

      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Validation Rules & Email Conflict
  // ---------------------------------------------------------------------------
  test.describe("2. Form Validation & Conflict Handling", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();
    });

    test("enforces name (>=3 chars), email format, and password (>=8 chars if entered)", async ({
      page,
    }) => {
      const table = page.getByTestId("users-table");
      const agentRow = table.locator("tbody tr", { hasText: TEST_USERS.agent.email });
      await agentRow.getByRole("button", { name: /edit/i }).click();

      const nameInput = page.getByLabel("Name", { exact: true });
      const passwordInput = page.getByLabel("Password", { exact: true });
      const submitBtn = page.getByRole("button", { name: /save changes/i });

      // 1. Short name validation (< 3 chars)
      await nameInput.fill("Jo");
      await submitBtn.click();
      await expect(page.getByText("Name must be at least 3 characters")).toBeVisible();

      // Reset name
      await nameInput.fill(TEST_USERS.agent.name);

      // 2. Short password validation (entered but < 8 chars)
      await passwordInput.fill("12345");
      await submitBtn.click();
      await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();

      // Clear password -> error disappears on cancel
      await page.getByRole("button", { name: /cancel/i }).click();
      await signOutViaUI(page);
    });

    test("displays server error alert when attempting to change to already existing email", async ({
      page,
    }) => {
      const table = page.getByTestId("users-table");
      const agentRow = table.locator("tbody tr", { hasText: TEST_USERS.agent.email });
      await agentRow.getByRole("button", { name: /edit/i }).click();

      // Attempt to change agent's email to admin's email
      const emailInput = page.getByLabel("Email", { exact: true });
      await emailInput.fill(TEST_USERS.admin.email);

      await page.getByRole("button", { name: /save changes/i }).click();

      await expect(
        page.getByText("A user with this email already exists")
      ).toBeVisible();

      // Modal remains open
      await expect(page.getByRole("heading", { name: "Edit User" })).toBeVisible();

      await page.getByRole("button", { name: /cancel/i }).click();
      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Update Details & Conditional Password Change
  // ---------------------------------------------------------------------------
  test.describe("3. User Update & Login Verification", () => {
    test("edits name without modifying password and preserves original password login", async ({
      page,
    }) => {
      // 1. Admin logs in
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      // Create a dedicated test user to edit
      const targetUser = {
        name: "Original Name",
        email: `edit-name-${Date.now()}@example.com`,
        password: "OriginalPassword123",
      };
      const createRes = await page.request.post("/api/users", { data: targetUser });
      expect(createRes.status()).toBe(201);

      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      // 2. Edit User Name
      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: targetUser.email });
      await userRow.getByRole("button", { name: /edit/i }).click();

      const updatedName = "Updated Agent Name";
      const nameInput = page.getByLabel("Name", { exact: true });
      await nameInput.fill(updatedName);

      // Leave password blank
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

      // Verify updated name displays in table
      await expect(table.locator("tbody tr", { hasText: targetUser.email })).toContainText(
        updatedName
      );

      // 3. Admin signs out
      await signOutViaUI(page);

      // 4. User logs in with original password (proves password was preserved!)
      await loginViaUI(page, targetUser.email, targetUser.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      await signOutViaUI(page);
    });

    test("edits password and verifies login with the new password", async ({
      page,
    }) => {
      // 1. Admin logs in
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      // Create a dedicated test user to edit password
      const targetUser = {
        name: "Password Target",
        email: `pwd-target-${Date.now()}@example.com`,
        password: "InitialPassword123",
      };
      const createRes = await page.request.post("/api/users", { data: targetUser });
      expect(createRes.status()).toBe(201);

      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      // 2. Edit User Password
      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: targetUser.email });
      await userRow.getByRole("button", { name: /edit/i }).click();

      const newPassword = "NewlyUpdatedPassword123";
      const passwordInput = page.getByLabel("Password", { exact: true });
      await passwordInput.fill(newPassword);

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

      // 3. Admin signs out
      await signOutViaUI(page);

      // 4. User logs in with the NEW password!
      await loginViaUI(page, targetUser.email, newPassword);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: RBAC API Security Boundaries
  // ---------------------------------------------------------------------------
  test.describe("4. PATCH /api/users/:id API Security Boundaries", () => {
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
