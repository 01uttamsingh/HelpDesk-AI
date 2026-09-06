import { Page, expect } from "@playwright/test";

export const TEST_USERS = {
  admin: {
    email: "test@example.com",
    password: "uvdb1357",
    name: "Admin",
    role: "ADMIN",
  },
  adminAlias: {
    email: "admin@example.com",
    password: "uvdb1357",
    name: "Admin",
    role: "ADMIN",
  },
  agent: {
    email: "agent@example.com",
    password: "uvdb1357",
    name: "Agent",
    role: "AGENT",
  },
};

/**
 * Perform login via UI form submission
 */
export async function loginViaUI(
  page: Page,
  email = TEST_USERS.admin.email,
  password = TEST_USERS.admin.password
) {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

/**
 * Perform sign-out via Navbar button
 */
export async function signOutViaUI(page: Page) {
  const signOutBtn = page.getByRole("button", { name: /sign out/i });
  await expect(signOutBtn).toBeVisible();
  await signOutBtn.click();
  await expect(page).toHaveURL(/\/login/);
}
