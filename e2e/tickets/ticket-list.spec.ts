import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("Ticket List (Happy Path & Routing)", () => {
  test("displays tickets ordered newest first by default on the tickets page", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();

    // 1. Create first (older) ticket via webhook
    const oldSubject = `Alpha Ticket (Older) [${timestamp}]`;
    const res1 = await request.post("/api/webhooks/email", {
      data: {
        from: `Student One <student1.${timestamp}@example.com>`,
        subject: oldSubject,
        text: "My first ticket regarding lesson 1.",
        category: "General Question",
      },
    });
    expect(res1.status()).toBe(201);
    const { data: ticket1 } = await res1.json();

    // Brief wait to ensure distinct creation timestamp
    await page.waitForTimeout(100);

    // 2. Create second (newer) ticket via webhook
    const newSubject = `Beta Ticket (Newer) [${timestamp}]`;
    const res2 = await request.post("/api/webhooks/email", {
      data: {
        from: `Student Two <student2.${timestamp}@example.com>`,
        subject: newSubject,
        text: "My second ticket regarding lesson 2.",
        category: "Technical Questions",
      },
    });
    expect(res2.status()).toBe(201);
    const { data: ticket2 } = await res2.json();

    // 3. Agent logs in and visits Dashboard
    await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await expect(page).toHaveURL("/");

    // 4. Verify Tickets link exists in Navbar and is active
    const ticketsNavLink = page.getByTestId("nav-tickets-link");
    await expect(ticketsNavLink).toBeVisible();

    // 5. Navigate to /tickets
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: /^tickets$/i })).toBeVisible();

    // 6. Verify tickets table renders both tickets
    const rowNewer = page.getByTestId(`ticket-row-${ticket2.id}`);
    const rowOlder = page.getByTestId(`ticket-row-${ticket1.id}`);
    await expect(rowNewer).toBeVisible();
    await expect(rowOlder).toBeVisible();

    // 7. Verify ordering: Newer ticket appears above the older ticket in DOM
    const allRows = page.locator("[data-testid^='ticket-row-']");
    const count = await allRows.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Extract text content of rows to verify relative position
    const rowTexts = await allRows.allTextContents();
    const indexNewer = rowTexts.findIndex((t) => t.includes(newSubject));
    const indexOlder = rowTexts.findIndex((t) => t.includes(oldSubject));

    expect(indexNewer).toBeGreaterThanOrEqual(0);
    expect(indexOlder).toBeGreaterThanOrEqual(0);
    expect(indexNewer).toBeLessThan(indexOlder); // Newer ticket comes FIRST

    // 8. Verify ticket metadata and badges
    await expect(rowNewer).toContainText("Student Two");
    await expect(rowNewer).toContainText(`student2.${timestamp}@example.com`);
    await expect(rowNewer).toContainText("Technical Question");
    await expect(rowNewer).toContainText("Open");

    await signOutViaUI(page);
  });

  test("sorts tickets on server when clicking column header", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();

    // 1. Create first (older) ticket
    const oldSubject = `Old Ticket E2E [${timestamp}]`;
    const res1 = await request.post("/api/webhooks/email", {
      data: {
        from: `Student One <student1.${timestamp}@example.com>`,
        subject: oldSubject,
        text: "Older ticket text.",
      },
    });
    expect(res1.status()).toBe(201);
    const { data: ticket1 } = await res1.json();

    await page.waitForTimeout(100);

    // 2. Create second (newer) ticket
    const newSubject = `New Ticket E2E [${timestamp}]`;
    const res2 = await request.post("/api/webhooks/email", {
      data: {
        from: `Student Two <student2.${timestamp}@example.com>`,
        subject: newSubject,
        text: "Newer ticket text.",
      },
    });
    expect(res2.status()).toBe(201);
    const { data: ticket2 } = await res2.json();

    // 3. Login and go to /tickets
    await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await expect(page).toHaveURL("/");
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: /^tickets$/i })).toBeVisible();

    const rowNewer = page.getByTestId(`ticket-row-${ticket2.id}`);
    const rowOlder = page.getByTestId(`ticket-row-${ticket1.id}`);
    await expect(rowNewer).toBeVisible();
    await expect(rowOlder).toBeVisible();

    // 4. By default, newest is first
    let allRows = page.locator("[data-testid^='ticket-row-']");
    let rowTexts = await allRows.allTextContents();
    let indexNewer = rowTexts.findIndex((t) => t.includes(newSubject));
    let indexOlder = rowTexts.findIndex((t) => t.includes(oldSubject));
    expect(indexNewer).toBeLessThan(indexOlder);

    // 5. Click the "Created" column header to sort ascending (oldest first)
    const createdHeader = page.getByTestId("sort-header-createdAt");
    await createdHeader.click();

    // Verify sort asc indicator is present
    await expect(page.getByTestId("sort-asc-createdAt")).toBeVisible();

    // Verify older ticket is now before newer ticket
    await expect(async () => {
      const updatedTexts = await page.locator("[data-testid^='ticket-row-']").allTextContents();
      const updatedIndexNewer = updatedTexts.findIndex((t) => t.includes(newSubject));
      const updatedIndexOlder = updatedTexts.findIndex((t) => t.includes(oldSubject));
      expect(updatedIndexOlder).toBeLessThan(updatedIndexNewer);
    }).toPass();

    await signOutViaUI(page);
  });

  test("redirects unauthenticated visitor from /tickets to /login", async ({
    page,
  }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login/);
  });
});
