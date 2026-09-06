import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("Authentication - Sign In & Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test.describe("1. Successful Login", () => {
    test("submits valid credentials, redirects to home, and shows user in navbar", async ({
      page,
    }) => {
      // 1. Fill valid admin credentials
      await page.getByLabel(/email address/i).fill(TEST_USERS.admin.email);
      await page.getByLabel("Password", { exact: true }).fill(TEST_USERS.admin.password);

      // 2. Submit form
      await page.getByRole("button", { name: /^sign in$/i }).click();

      // 3. Verify redirect to home page
      await expect(page).toHaveURL("/");

      // 4. Verify Navbar reflects authenticated state
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

  test.describe("2. Email Normalization & Case-Insensitivity", () => {
    test("authenticates successfully with uppercase email", async ({ page }) => {
      const upperEmail = TEST_USERS.admin.email.toUpperCase(); // TEST@EXAMPLE.COM
      await page.getByLabel(/email address/i).fill(upperEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_USERS.admin.password);
      await page.getByRole("button", { name: /^sign in$/i }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await signOutViaUI(page);
    });

    test("authenticates successfully with mixed-case email", async ({ page }) => {
      const mixedEmail = "Admin@Example.com";
      await page.getByLabel(/email address/i).fill(mixedEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_USERS.adminAlias.password);
      await page.getByRole("button", { name: /^sign in$/i }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await signOutViaUI(page);
    });

    test("authenticates successfully with leading and trailing whitespace", async ({ page }) => {
      const paddedEmail = `   ${TEST_USERS.admin.email}   `;
      await page.getByLabel(/email address/i).fill(paddedEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_USERS.admin.password);
      await page.getByRole("button", { name: /^sign in$/i }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await signOutViaUI(page);
    });
  });

  test.describe("3. Invalid Credentials & Error Handling", () => {
    test("displays destructive error alert for wrong password with existing email", async ({
      page,
    }) => {
      await page.getByLabel(/email address/i).fill(TEST_USERS.admin.email);
      await page.getByLabel("Password", { exact: true }).fill("wrongpassword123");
      await page.getByRole("button", { name: /^sign in$/i }).click();

      // Verify destructive alert is visible
      const alert = page.getByRole("alert");
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(/invalid email or password/i);

      // Verify user remains on /login
      await expect(page).toHaveURL(/\/login/);
    });

    test("displays destructive error alert for non-existent user email", async ({ page }) => {
      await page.getByLabel(/email address/i).fill("nonexistent@example.com");
      await page.getByLabel("Password", { exact: true }).fill("password123");
      await page.getByRole("button", { name: /^sign in$/i }).click();

      const alert = page.getByRole("alert");
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(/invalid email or password/i);

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("4. Form Validation & UI Controls", () => {
    test("displays required field validation errors when submitting empty form", async ({
      page,
    }) => {
      // Click sign in immediately without typing
      await page.getByRole("button", { name: /^sign in$/i }).click();

      // Check validation error messages
      await expect(page.getByText("Email is required")).toBeVisible();
      await expect(page.getByText("Password is required")).toBeVisible();

      // Verify aria-invalid states
      await expect(page.getByLabel(/email address/i)).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
        "aria-invalid",
        "true"
      );

      // Verify user remains on /login
      await expect(page).toHaveURL(/\/login/);
    });

    test("displays invalid format error when submitting malformed email", async ({ page }) => {
      await page.getByLabel(/email address/i).fill("not-an-email");
      await page.getByLabel("Password", { exact: true }).fill("somepassword");
      await page.getByRole("button", { name: /^sign in$/i }).click();

      await expect(page.getByText("Please enter a valid email address")).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toHaveAttribute("aria-invalid", "true");
      await expect(page).toHaveURL(/\/login/);
    });

    test("toggles password visibility between masked and plain text", async ({ page }) => {
      const passwordInput = page.getByLabel("Password", { exact: true });
      await passwordInput.fill("secretPassword");

      // Initial state is password
      await expect(passwordInput).toHaveAttribute("type", "password");
      const toggleButton = page.getByRole("button", { name: /show password/i });
      await expect(toggleButton).toBeVisible();

      // Click to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await expect(page.getByRole("button", { name: /hide password/i })).toBeVisible();

      // Click to hide password again
      await page.getByRole("button", { name: /hide password/i }).click();
      await expect(passwordInput).toHaveAttribute("type", "password");
      await expect(page.getByRole("button", { name: /show password/i })).toBeVisible();
    });
  });
});
