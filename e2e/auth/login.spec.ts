import { test, expect } from "@playwright/test";
import { TEST_USERS, signOutViaUI } from "../helpers/auth";

test.describe("Authentication - Real Browser Sign In Flow", () => {
  test("submits valid credentials, establishes session cookie, redirects to home, and shows user in navbar", async ({
    page,
  }) => {
    await page.goto("/login");

    // 1. Fill valid admin credentials
    await page.getByLabel(/email address/i).fill(TEST_USERS.admin.email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_USERS.admin.password);

    // 2. Submit form
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // 3. Verify redirect to home page
    await expect(page).toHaveURL("/");

    // 4. Verify Navbar reflects authenticated state with real session
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await expect(page.locator("header").getByText(TEST_USERS.admin.name)).toBeVisible();

    // 5. Verify Home page greeting
    await expect(
      page.getByRole("heading", { name: new RegExp(`welcome, ${TEST_USERS.admin.name}!`, "i") })
    ).toBeVisible();

    // Clean up session
    await signOutViaUI(page);
  });
});
