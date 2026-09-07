import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User List - Refresh, Empty States & RBAC Security", () => {
  test.describe("1. Data Refresh & Empty State", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();
    });

    test("re-fetches users list when clicking Refresh button", async ({ page }) => {
      const refreshBtn = page.getByRole("button", { name: /refresh/i });
      await expect(refreshBtn).toBeVisible();

      // Click refresh and ensure /api/users request succeeds
      const [response] = await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/users") && res.status() === 200),
        refreshBtn.click(),
      ]);

      expect(response.ok()).toBe(true);
      await expect(page.getByTestId("users-table")).toBeVisible();

      await signOutViaUI(page);
    });

    test("displays empty state with clear button when search query has no matches", async ({
      page,
    }) => {
      const table = page.getByTestId("users-table");
      const searchInput = page.getByPlaceholder(/search users by name or email/i);

      // Search for nonexistent query
      await searchInput.fill("NonExistentUser9999");
      await expect(page.getByText(/no users found matching/i)).toBeVisible();

      // Click "Clear search filter" button
      const clearBtn = page.getByRole("button", { name: /clear search filter/i });
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();

      // Full list restored
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).toBeVisible();

      await signOutViaUI(page);
    });
  });

  test.describe("2. Role-Based Access Control (RBAC) - Agent Protection", () => {
    test("hides Users navbar link, redirects direct /users visit to /, and blocks /api/users with 403", async ({
      page,
    }) => {
      // 1. Agent logs in
      await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      // 2. Verifies "Users" link is NOT present in Navbar
      await expect(
        page.locator("header").getByRole("link", { name: /^users$/i })
      ).not.toBeVisible();

      // 3. Attempts direct navigation to /users -> verify redirect to / (blocked by AdminRoute)
      await page.goto("/users");
      await expect(page).toHaveURL("/");

      // 4. Attempts API request GET /api/users using page.request -> 403 Forbidden
      const apiResponse = await page.request.get("/api/users");
      expect(apiResponse.status()).toBe(403);
      const apiBody = await apiResponse.json();
      expect(apiBody).toEqual({
        success: false,
        error: "Forbidden: ADMIN access required",
      });

      // 5. Attempts API request GET /api/admin/users using page.request -> 403 Forbidden
      const legacyResponse = await page.request.get("/api/admin/users");
      expect(legacyResponse.status()).toBe(403);
      const legacyBody = await legacyResponse.json();
      expect(legacyBody).toEqual({
        success: false,
        error: "Forbidden: ADMIN access required",
      });

      await signOutViaUI(page);
    });
  });

  test.describe("3. Unauthenticated Protection", () => {
    test("redirects unauthenticated visitor from /users to /login", async ({ page }) => {
      await page.goto("/users");
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText(/sign in to helpdesk/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    });

    test("rejects unauthenticated API request GET /api/users with 401 Unauthorized", async ({
      request,
    }) => {
      const res = await request.get("/api/users");
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    });

    test("rejects unauthenticated API request GET /api/admin/users with 401 Unauthorized", async ({
      request,
    }) => {
      const res = await request.get("/api/admin/users");
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    });
  });

  test.describe("4. API Backward Compatibility", () => {
    test("serves GET /api/admin/users successfully with safe user fields for authenticated Admin", async ({
      page,
    }) => {
      // 1. Admin logs in
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");

      // 2. Make authenticated call to legacy /api/admin/users
      const res = await page.request.get("/api/admin/users");
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);

      // 3. Verify safe payload structure and omission of sensitive fields (password, tokens)
      const adminUser = body.data.find(
        (u: { email: string }) => u.email === TEST_USERS.admin.email
      );
      expect(adminUser).toBeDefined();
      expect(adminUser.role).toBe("ADMIN");
      expect(adminUser.emailVerified).toBe(true);
      expect(adminUser).not.toHaveProperty("password");

      const agentUser = body.data.find(
        (u: { email: string }) => u.email === TEST_USERS.agent.email
      );
      expect(agentUser).toBeDefined();
      expect(agentUser.role).toBe("AGENT");
      expect(agentUser).not.toHaveProperty("password");

      await signOutViaUI(page);
    });
  });
});
