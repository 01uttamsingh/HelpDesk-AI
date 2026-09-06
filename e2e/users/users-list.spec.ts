import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User List & RBAC Security Boundaries", () => {
  // ---------------------------------------------------------------------------
  // Scenario 2.a: Admin Access & User Listing
  // ---------------------------------------------------------------------------
  test.describe("1. Admin Access & User Listing", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    });

    test("navigates to /users via Navbar link, renders summary cards, and lists users in table with role badges", async ({
      page,
    }) => {
      // 1. Verify "Users" link is present in Navbar and click it
      const usersNavLink = page.locator("header").getByRole("link", { name: /^users$/i });
      await expect(usersNavLink).toBeVisible();
      await usersNavLink.click();

      // 2. Verify URL is /users
      await expect(page).toHaveURL("/users");

      // 3. Verify Page Heading
      await expect(page.getByRole("heading", { name: /^users$/i, exact: true })).toBeVisible();

      // 4. Verify Summary Stat Cards
      const statsContainer = page.locator("div.grid");
      await expect(statsContainer.getByText("Total Users")).toBeVisible();
      await expect(statsContainer.getByText("Administrators")).toBeVisible();
      await expect(statsContainer.getByText("Support Agents")).toBeVisible();

      // Ensure summary cards finish loading (counts are no longer "...")
      const totalUsersCard = statsContainer.locator("div").filter({ hasText: "Total Users" });
      await expect(totalUsersCard.locator(".text-2xl")).not.toHaveText("...");

      // 5. Verify Users Table exists
      const table = page.getByTestId("users-table");
      await expect(table).toBeVisible();

      // Verify Table Header Columns
      await expect(table.getByRole("columnheader", { name: "User" })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Email", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Role" })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Email Status" })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Joined" })).toBeVisible();

      // 6. Verify Admin User row and Role Badge
      const adminRow = table.locator("tbody tr", { hasText: TEST_USERS.admin.email });
      await expect(adminRow).toBeVisible();
      // Target Role cell (column index 2) to avoid strict-mode ambiguity with user name "Admin"
      await expect(adminRow.locator("td").nth(2)).toContainText("Admin");
      await expect(adminRow.locator("td").nth(3)).toContainText("Verified");

      // 7. Verify Agent User row and Role Badge
      const agentRow = table.locator("tbody tr", { hasText: TEST_USERS.agent.email });
      await expect(agentRow).toBeVisible();
      await expect(agentRow.locator("td").nth(2)).toContainText("Agent");

      // Teardown session
      await signOutViaUI(page);
    });

    test("re-fetches users list when clicking Refresh button", async ({ page }) => {
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

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
  });

  // ---------------------------------------------------------------------------
  // Scenario 2.b: Search & Role Filtering
  // ---------------------------------------------------------------------------
  test.describe("2. Search & Role Filtering", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();
      // Ensure skeleton rows have completed loading
      await expect(
        page.getByTestId("users-table").locator("tbody tr", { hasText: TEST_USERS.admin.email })
      ).toBeVisible();
    });

    test("filters user list in real-time when searching by text and clears filter", async ({
      page,
    }) => {
      const table = page.getByTestId("users-table");
      const searchInput = page.getByPlaceholder(/search users by name or email/i);

      // Verify initial state: both Admin and Agent users are listed
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).toBeVisible();

      // 1. Type "Agent" into search input
      await searchInput.fill("Agent");

      // 2. Verify only Agent user row is visible; Admin rows are hidden
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).not.toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.adminAlias.email })).not.toBeVisible();

      // 3. Clear search input
      await searchInput.clear();

      // 4. Verify full list is restored
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).toBeVisible();

      await signOutViaUI(page);
    });

    test("filters user list by role buttons: Admins, Agents, and All", async ({ page }) => {
      const table = page.getByTestId("users-table");

      // 1. Click "Admins" filter button
      await page.getByRole("button", { name: /^admins/i }).click();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).not.toBeVisible();

      // 2. Click "Agents" filter button
      await page.getByRole("button", { name: /^agents/i }).click();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).not.toBeVisible();

      // 3. Click "All" filter button
      await page.getByRole("button", { name: /^all/i }).click();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).toBeVisible();
      await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).toBeVisible();

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

  // ---------------------------------------------------------------------------
  // Scenario 2.c: Role-Based Access Control (RBAC) - Agent Protection
  // ---------------------------------------------------------------------------
  test.describe("3. Role-Based Access Control (RBAC) - Agent Protection", () => {
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

  // ---------------------------------------------------------------------------
  // Scenario 2.d: Unauthenticated Protection
  // ---------------------------------------------------------------------------
  test.describe("4. Unauthenticated Protection", () => {
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

  // ---------------------------------------------------------------------------
  // Scenario 2.e: Backward Compatibility
  // ---------------------------------------------------------------------------
  test.describe("5. API Backward Compatibility", () => {
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
