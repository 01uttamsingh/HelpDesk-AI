import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("User Creation & Validation Flows", () => {
  // ---------------------------------------------------------------------------
  // Scenario 1: Modal Open, Dismissal, and Form Validation
  // ---------------------------------------------------------------------------
  test.describe("1. Modal Dialog & Client-Side Validation", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();
    });

    test("opens modal on clicking 'Create User' button and closes on 'Cancel'", async ({
      page,
    }) => {
      // 1. Verify Create User button is visible above user list
      const createBtn = page.getByRole("button", { name: /create user/i });
      await expect(createBtn).toBeVisible();

      // 2. Click button to open modal
      await createBtn.click();

      // 3. Verify modal dialog title and form fields
      await expect(
        page.getByRole("heading", { name: "Create New User" })
      ).toBeVisible();
      await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Password", { exact: true })).toBeVisible();

      // 4. Click Cancel button to dismiss modal
      const cancelBtn = page.getByRole("button", { name: /cancel/i });
      await expect(cancelBtn).toBeVisible();
      await cancelBtn.click();

      // 5. Verify modal is closed
      await expect(
        page.getByRole("heading", { name: "Create New User" })
      ).not.toBeVisible();

      await signOutViaUI(page);
    });

    test("enforces validation rules for name (>=3 chars), email (valid), and password (>=8 chars)", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /create user/i }).click();
      await expect(
        page.getByRole("heading", { name: "Create New User" })
      ).toBeVisible();

      const nameInput = page.getByLabel("Name", { exact: true });
      const emailInput = page.getByLabel("Email", { exact: true });
      const passwordInput = page.getByLabel("Password", { exact: true });
      const submitBtn = page
        .locator("form")
        .getByRole("button", { name: /^create user$/i });

      // 1. Test Name validation (< 3 chars)
      await nameInput.fill("Jo");
      await emailInput.fill("valid@example.com");
      await passwordInput.fill("password123");
      await submitBtn.click();

      await expect(
        page.getByText("Name must be at least 3 characters")
      ).toBeVisible();

      // 2. Test Email validation (invalid format)
      await nameInput.fill("John Doe");
      await emailInput.fill("not-an-email");
      await submitBtn.click();

      await expect(
        page.getByText("Please enter a valid email address")
      ).toBeVisible();

      // 3. Test Password validation (< 8 chars)
      await emailInput.fill("valid@example.com");
      await passwordInput.fill("1234567");
      await submitBtn.click();

      await expect(
        page.getByText("Password must be at least 8 characters")
      ).toBeVisible();

      // Dismiss modal
      await page.getByRole("button", { name: /cancel/i }).click();
      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Successful User Creation, Table Update, and Login Verification
  // ---------------------------------------------------------------------------
  test.describe("2. User Creation, Persistence, and Login Journey", () => {
    const newAgent = {
      name: "Playwright Test Agent",
      email: `testagent-${Date.now()}@example.com`,
      password: "TestPassword123",
    };

    test("creates new user, closes modal, renders user in table, and verifies login", async ({
      page,
    }) => {
      // 1. Log in as Admin
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();

      // 2. Open Create User modal
      await page.getByRole("button", { name: /create user/i }).click();
      await expect(
        page.getByRole("heading", { name: "Create New User" })
      ).toBeVisible();

      // 3. Fill valid details
      await page.getByLabel("Name", { exact: true }).fill(newAgent.name);
      await page.getByLabel("Email", { exact: true }).fill(newAgent.email);
      await page.getByLabel("Password", { exact: true }).fill(newAgent.password);

      // 4. Submit form and verify POST /api/users request succeeds
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes("/api/users") &&
            res.request().method() === "POST" &&
            res.status() === 201
        ),
        page.locator("form").getByRole("button", { name: /^create user$/i }).click(),
      ]);

      expect(response.ok()).toBe(true);

      // 5. Verify modal is automatically closed
      await expect(
        page.getByRole("heading", { name: "Create New User" })
      ).not.toBeVisible();

      // 6. Verify newly created user appears in the table with Agent badge
      const table = page.getByTestId("users-table");
      const userRow = table.locator("tbody tr", { hasText: newAgent.email });
      await expect(userRow).toBeVisible();
      await expect(userRow).toContainText(newAgent.name);
      await expect(userRow.locator("td").nth(2)).toContainText("Agent");

      // 7. Sign out admin
      await signOutViaUI(page);

      // 8. Log in with the newly created user credentials!
      await loginViaUI(page, newAgent.email, newAgent.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

      // 9. Verify Agent does NOT have admin access to /users
      await expect(
        page.locator("header").getByRole("link", { name: /^users$/i })
      ).not.toBeVisible();

      await page.goto("/users");
      await expect(page).toHaveURL("/");

      await signOutViaUI(page);
    });

    test("displays server error alert in modal when attempting to create duplicate email", async ({
      page,
    }) => {
      // 1. Admin logs in
      await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
      await page.goto("/users");
      await expect(page.getByTestId("users-table")).toBeVisible();


      // 2. Open Create User modal
      await page.getByRole("button", { name: /create user/i }).click();

      // 3. Attempt to create user with already existing Admin email
      await page.getByLabel("Name", { exact: true }).fill("Duplicate Test");
      await page.getByLabel("Email", { exact: true }).fill(TEST_USERS.admin.email);
      await page.getByLabel("Password", { exact: true }).fill("password123");

      await page.locator("form").getByRole("button", { name: /^create user$/i }).click();

      // 4. Verify destructive alert displays server conflict error
      await expect(
        page.getByText("A user with this email already exists")
      ).toBeVisible();

      // 5. Modal remains open so user can correct the input
      await expect(
        page.getByRole("heading", { name: "Create New User" })
      ).toBeVisible();

      await page.getByRole("button", { name: /cancel/i }).click();
      await signOutViaUI(page);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: API Protection (RBAC)
  // ---------------------------------------------------------------------------
  test.describe("3. POST /api/users API Security Boundaries", () => {
    test("rejects unauthenticated POST /api/users with 401 Unauthorized", async ({
      request,
    }) => {
      const res = await request.post("/api/users", {
        data: {
          name: "Attacker",
          email: "attacker@example.com",
          password: "password123",
        },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    });

    test("rejects Agent user POST /api/users with 403 Forbidden", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
      await expect(page).toHaveURL("/");

      const res = await page.request.post("/api/users", {
        data: {
          name: "Agent Created User",
          email: "unauthorized@example.com",
          password: "password123",
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
