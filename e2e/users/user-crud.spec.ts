import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

/**
 * User Management - Focused Happy Paths Suite (CRUD)
 *
 * Covers solely the happy-path flows for all four CRUD operations:
 * 1. CREATE: Admin creates a new user via the Create User modal.
 * 2. READ:   Admin views, searches, and filters users in the table.
 * 3. UPDATE: Admin updates an existing user's details and password.
 * 4. DELETE: Admin soft-deletes a user with modal confirmation.
 */
test.describe("User Management - Happy Path CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await page.goto("/users");
    await expect(page.getByTestId("users-table")).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    if (await page.getByRole("button", { name: /sign out/i }).isVisible()) {
      await signOutViaUI(page);
    }
  });

  // ---------------------------------------------------------------------------
  // 1. CREATE (Happy Path)
  // ---------------------------------------------------------------------------
  test("CREATE: creates a new user and displays them in the table", async ({ page }) => {
    const newUser = {
      name: "Happy Create Agent",
      email: `happy-create-${Date.now()}@example.com`,
      password: "ValidPassword123!",
    };

    // Open create user modal
    const createBtn = page.getByRole("button", { name: /create user/i });
    await createBtn.click();
    await expect(page.getByRole("heading", { name: "Create New User" })).toBeVisible();

    // Fill form
    await page.getByLabel("Name", { exact: true }).fill(newUser.name);
    await page.getByLabel("Email", { exact: true }).fill(newUser.email);
    await page.getByLabel("Password", { exact: true }).fill(newUser.password);

    // Submit
    const [createRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/users") &&
          res.request().method() === "POST" &&
          res.status() === 201
      ),
      page.getByRole("button", { name: /^create user$/i }).click(),
    ]);

    expect(createRes.ok()).toBe(true);

    // Modal closes automatically
    await expect(page.getByRole("heading", { name: "Create New User" })).not.toBeVisible();

    // User is rendered in the users table
    const table = page.getByTestId("users-table");
    const userRow = table.locator("tbody tr", { hasText: newUser.email });
    await expect(userRow).toBeVisible();
    await expect(userRow.getByText(newUser.name)).toBeVisible();
    await expect(userRow.getByText("Agent", { exact: true })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 2. READ (Happy Path)
  // ---------------------------------------------------------------------------
  test("READ: lists users and filters by search query and role", async ({ page }) => {
    const table = page.getByTestId("users-table");

    // 1. Verify table displays users and summary statistics
    await expect(table.locator("tbody tr")).not.toHaveCount(0);
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Administrators")).toBeVisible();
    await expect(page.getByText("Support Agents")).toBeVisible();

    // 2. Search filtering by user name or email
    const searchInput = page.getByPlaceholder("Search users by name or email...");
    await searchInput.fill(TEST_USERS.admin.name);
    await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).toBeVisible();

    // Clear search
    await searchInput.clear();

    // 3. Role filtering by Agents
    const agentsFilterBtn = page.getByRole("button", { name: /^Agents/ });
    await agentsFilterBtn.click();
    await expect(table.locator("tbody tr", { hasText: TEST_USERS.agent.email })).toBeVisible();
    await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).not.toBeVisible();

    // Restore All filter
    const allFilterBtn = page.getByRole("button", { name: /^All/ });
    await allFilterBtn.click();
    await expect(table.locator("tbody tr", { hasText: TEST_USERS.admin.email })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3. UPDATE (Happy Path)
  // ---------------------------------------------------------------------------
  test("UPDATE: edits user name and password, verifying changes and login", async ({
    page,
  }) => {
    // Create dedicated user for editing
    const userToEdit = {
      name: "Pre Edit Name",
      email: `pre-edit-${Date.now()}@example.com`,
      password: "InitialPassword123!",
    };
    const createRes = await page.request.post("/api/users", { data: userToEdit });
    expect(createRes.status()).toBe(201);

    await page.reload();
    await expect(page.getByTestId("users-table")).toBeVisible();

    const table = page.getByTestId("users-table");
    const userRow = table.locator("tbody tr", { hasText: userToEdit.email });
    await expect(userRow).toBeVisible();

    // Click edit button
    const editBtn = userRow.getByRole("button", { name: `Edit ${userToEdit.name}` });
    await editBtn.click();
    await expect(page.getByRole("heading", { name: "Edit User" })).toBeVisible();

    // Update name and password
    const updatedName = "Post Edit Updated Name";
    const newPassword = "UpdatedPassword456!";
    const nameInput = page.getByLabel("Name", { exact: true });
    const passwordInput = page.getByLabel("Password", { exact: true });

    await nameInput.fill(updatedName);
    await passwordInput.fill(newPassword);

    // Save changes
    const [updateRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/users/") &&
          res.request().method() === "PATCH" &&
          res.status() === 200
      ),
      page.getByRole("button", { name: /save changes/i }).click(),
    ]);

    expect(updateRes.ok()).toBe(true);
    await expect(page.getByRole("heading", { name: "Edit User" })).not.toBeVisible();

    // Verify updated name in table
    await expect(table.locator("tbody tr", { hasText: userToEdit.email })).toContainText(
      updatedName
    );

    // Sign out admin and verify login with new password
    await signOutViaUI(page);
    await loginViaUI(page, userToEdit.email, newPassword);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 4. DELETE (Happy Path)
  // ---------------------------------------------------------------------------
  test("DELETE: soft-deletes user via confirmation modal and blocks subsequent login", async ({
    page,
  }) => {
    // Create dedicated user for deletion
    const userToDelete = {
      name: "Delete Happy Target",
      email: `delete-happy-${Date.now()}@example.com`,
      password: "HappyDeletePassword123!",
    };
    const createRes = await page.request.post("/api/users", { data: userToDelete });
    expect(createRes.status()).toBe(201);
    const { data: createdUser } = await createRes.json();

    await page.reload();
    await expect(page.getByTestId("users-table")).toBeVisible();

    const table = page.getByTestId("users-table");
    const userRow = table.locator("tbody tr", { hasText: userToDelete.email });
    await expect(userRow).toBeVisible();

    // Click delete button
    const deleteBtn = userRow.getByRole("button", { name: `Delete ${userToDelete.name}` });
    await deleteBtn.click();

    // Confirmation modal appears
    await expect(page.getByRole("heading", { name: "Delete User" })).toBeVisible();
    await expect(
      page.getByText(`Are you sure you want to delete ${userToDelete.name}`)
    ).toBeVisible();

    // Confirm deletion
    const [delRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/users/${createdUser.id}`) &&
          res.request().method() === "DELETE" &&
          res.status() === 200
      ),
      page.getByRole("button", { name: /^delete user$/i }).click(),
    ]);

    expect(delRes.ok()).toBe(true);

    // Modal closes and row is removed from table
    await expect(page.getByRole("heading", { name: "Delete User" })).not.toBeVisible();
    await expect(userRow).not.toBeVisible();

    // Sign out admin and verify deleted user cannot log in
    await signOutViaUI(page);
    await loginViaUI(page, userToDelete.email, userToDelete.password);

    await expect(page.getByText(/this account has been deactivated/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
