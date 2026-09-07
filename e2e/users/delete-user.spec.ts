import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User Deletion & Deactivation Flows", () => {
  // ---------------------------------------------------------------------------
  // Scenario 1: Modal Dialog, Confirmation & Dismissal Handlers
  // ---------------------------------------------------------------------------
  test.describe("1. Confirmation Modal & Dismissal Behaviors", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();
    });

    test("opens confirmation modal with user details and dismisses on Cancel", async ({
      page,
    }) => {
      // Create a dedicated target user so we don't mutate shared seed data
      const targetUser = {
        name: "Dismissal Target",
        email: `dismiss-target-${Date.now()}@example.com`,
        password: "TempPassword123",
      };
      const createRes = await page.request.post("/api/users", { data: targetUser });
      expect(createRes.status()).toBe(201);

      await page.reload();
      await expect(page.getByTestId("users-table")).toBeVisible();

      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: targetUser.email });
      await expect(userRow).toBeVisible();

      // 1. Click delete button
      const deleteBtn = userRow.getByRole("button", { name: `Delete ${targetUser.name}` });
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();

      // 2. Verify modal details
      await expect(page.getByRole("heading", { name: "Delete User" })).toBeVisible();
      await expect(
        page.getByText(`Are you sure you want to delete ${targetUser.name} (${targetUser.email})?`)
      ).toBeVisible();

      // 3. Dismiss on Cancel
      const cancelBtn = page.getByRole("button", { name: /cancel/i });
      await cancelBtn.click();
      await expect(page.getByRole("heading", { name: "Delete User" })).not.toBeVisible();

      // Verify row is still in the table
      await expect(userRow).toBeVisible();

      await signOutViaUI(page);
    });

    test("closes confirmation modal when pressing Escape key", async ({ page }) => {
      const targetUser = {
        name: "Escape Target",
        email: `escape-target-${Date.now()}@example.com`,
        password: "TempPassword123",
      };
      const createRes = await page.request.post("/api/users", { data: targetUser });
      expect(createRes.status()).toBe(201);

      await page.reload();
      await expect(page.getByTestId("users-table")).toBeVisible();

      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: targetUser.email });
      await userRow.getByRole("button", { name: `Delete ${targetUser.name}` }).click();

      await expect(page.getByRole("heading", { name: "Delete User" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("heading", { name: "Delete User" })).not.toBeVisible();
      await expect(userRow).toBeVisible();

      await signOutViaUI(page);
    });

    test("closes confirmation modal when clicking backdrop", async ({ page }) => {
      const targetUser = {
        name: "Backdrop Target",
        email: `backdrop-target-${Date.now()}@example.com`,
        password: "TempPassword123",
      };
      const createRes = await page.request.post("/api/users", { data: targetUser });
      expect(createRes.status()).toBe(201);

      await page.reload();
      await expect(page.getByTestId("users-table")).toBeVisible();

      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: targetUser.email });
      await userRow.getByRole("button", { name: `Delete ${targetUser.name}` }).click();

      await expect(page.getByRole("heading", { name: "Delete User" })).toBeVisible();

      const backdrop = page.locator('[data-slot="dialog-backdrop"]');
      await expect(backdrop).toBeVisible();
      await backdrop.click({ position: { x: 10, y: 10 } });

      await expect(page.getByRole("heading", { name: "Delete User" })).not.toBeVisible();
      await expect(userRow).toBeVisible();

      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Admin Deletion Protection (UI & API)
  // ---------------------------------------------------------------------------
  test.describe("2. Administrator Deletion Protection", () => {
    test("renders disabled delete button for admin in the UI", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      const table = page.getByTestId("users-table");
      const adminRow = table.locator("tbody tr", { hasText: TEST_USERS.admin.email });
      await expect(adminRow).toBeVisible();

      const deleteBtn = adminRow.getByRole("button", { name: "Cannot delete admin user" });
      await expect(deleteBtn).toBeVisible();
      await expect(deleteBtn).toBeDisabled();
      await expect(deleteBtn).toHaveAttribute("title", "Administrators cannot be deleted");

      await signOutViaUI(page);
    });

    test("rejects direct API request to delete an administrator with 400 Bad Request", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");

      // Fetch users to get the admin's ID
      const usersRes = await page.request.get("/api/users");
      expect(usersRes.ok()).toBe(true);
      const { data: users } = await usersRes.json();
      const adminUser = users.find((u: any) => u.email === TEST_USERS.admin.email);
      expect(adminUser).toBeDefined();

      // Attempt DELETE on admin
      const delRes = await page.request.delete(`/api/users/${adminUser.id}`);
      expect(delRes.status()).toBe(400);
      const delBody = await delRes.json();
      expect(delBody).toEqual({
        success: false,
        error: "Administrators cannot be deleted",
      });

      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Successful Soft Deletion & Login Block
  // ---------------------------------------------------------------------------
  test.describe("3. Successful User Deletion & Session / Login Invalidation", () => {
    test("soft deletes user, removes from UI table, and prevents subsequent login", async ({
      page,
    }) => {
      // 1. Admin logs in
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      // 2. Create a dedicated agent to delete
      const targetUser = {
        name: "Delete Candidate",
        email: `del-candidate-${Date.now()}@example.com`,
        password: "TargetPassword123!",
      };
      const createRes = await page.request.post("/api/users", { data: targetUser });
      expect(createRes.status()).toBe(201);
      const { data: createdUser } = await createRes.json();

      // 3. Visit users page and find the user
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: targetUser.email });
      await expect(userRow).toBeVisible();

      // 4. Click delete button on the user
      const deleteBtn = userRow.getByRole("button", { name: `Delete ${targetUser.name}` });
      await deleteBtn.click();

      // 5. Confirm deletion in the modal
      await expect(page.getByRole("heading", { name: "Delete User" })).toBeVisible();

      const [delResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes(`/api/users/${createdUser.id}`) &&
            res.request().method() === "DELETE" &&
            res.status() === 200
        ),
        page.getByRole("button", { name: /^delete user$/i }).click(),
      ]);

      expect(delResponse.ok()).toBe(true);

      // 6. Verify modal is closed and row is gone from the table
      await expect(page.getByRole("heading", { name: "Delete User" })).not.toBeVisible();
      await expect(userRow).not.toBeVisible();

      // 7. Admin signs out
      await signOutViaUI(page);

      // 8. Attempt to log in with the deleted user's credentials
      await loginViaUI(page, targetUser.email, targetUser.password);

      // Login should fail with deactivation error alert
      await expect(
        page.getByText(/this account has been deactivated/i)
      ).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: Security & RBAC Boundaries
  // ---------------------------------------------------------------------------
  test.describe("4. DELETE /api/users/:id API Security Boundaries", () => {
    test("rejects unauthenticated DELETE /api/users/:id with 401 Unauthorized", async ({
      request,
    }) => {
      const res = await request.delete("/api/users/any-user-id");
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    });

    test("rejects Agent user DELETE /api/users/:id with 403 Forbidden", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
      await expect(page).toHaveURL("/");

      const res = await page.request.delete("/api/users/any-user-id");
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Forbidden: ADMIN access required",
      });

      await signOutViaUI(page);
    });

    test("returns 404 Not Found when deleting non-existent user", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");

      const res = await page.request.delete("/api/users/non-existent-user-id");
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "User not found",
      });

      await signOutViaUI(page);
    });
  });
});
