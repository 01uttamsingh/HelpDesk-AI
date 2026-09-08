import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("Role-Based Access Control (RBAC) - Admin Routes", () => {
  test("allows Admin user access to /users and renders Users link in navbar", async ({ page }) => {
    // 1. Admin logs in
    await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL("/");

    // 2. Verify "Users" link is visible in Navbar
    const usersLink = page.locator("header").getByRole("link", { name: /^users$/i });
    await expect(usersLink).toBeVisible();

    // 3. Navigate to /users and verify access
    await usersLink.click();
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: /^users$/i })).toBeVisible();

    await signOutViaUI(page);
  });

  test("restricts Agent user from /users, hiding navbar link and redirecting direct visits to /", async ({
    page,
  }) => {
    // 1. Agent logs in
    await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await expect(page).toHaveURL("/");

    // 2. Verify "Users" link is hidden in Navbar
    const usersLink = page.locator("header").getByRole("link", { name: /^users$/i });
    await expect(usersLink).not.toBeVisible();

    // 3. Attempt direct navigation to /users -> redirect back to /
    await page.goto("/users");
    await expect(page).toHaveURL("/");

    await signOutViaUI(page);
  });
});
