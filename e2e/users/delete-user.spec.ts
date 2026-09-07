import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User Deletion - Admin Protection & Security Boundaries", () => {
  test.describe("1. Administrator Deletion Protection", () => {
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

  test.describe("2. DELETE /api/users/:id API Security Boundaries", () => {
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
