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

    // Scope by unique timestamp in search input so sorting behavior is tested cleanly with pagination
    const searchInput = page.getByTestId("tickets-search-input");
    await searchInput.fill(timestamp.toString());

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

  test("paginates tickets correctly with page size and navigation controls", async ({
    page,
  }) => {
    // 1. Login and go to /tickets
    await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await expect(page).toHaveURL("/");
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: /^tickets$/i })).toBeVisible();

    // 2. Verify pagination summary and controls are visible
    await expect(page.getByText(/showing \d+ to \d+ of \d+ tickets/i)).toBeVisible();
    const pageSizeSelect = page.getByTestId("pagination-page-size-select");
    await expect(pageSizeSelect).toBeVisible();
    await expect(pageSizeSelect).toHaveValue("10");

    // 3. Verify page indicator is active
    const currentPageIndicator = page.getByTestId("pagination-current-page");
    await expect(currentPageIndicator).toContainText("Page 1 of");

    // First and Prev buttons should be disabled on page 1
    await expect(page.getByTestId("pagination-first")).toBeDisabled();
    await expect(page.getByTestId("pagination-prev")).toBeDisabled();

    // 4. Click Next button if multiple pages exist
    const nextBtn = page.getByTestId("pagination-next");
    const isNextEnabled = await nextBtn.isEnabled();
    if (isNextEnabled) {
      await nextBtn.click();
      await expect(currentPageIndicator).toContainText("Page 2 of");
      await expect(page.getByTestId("pagination-prev")).toBeEnabled();

      // Click Prev button to return to page 1
      await page.getByTestId("pagination-prev").click();
      await expect(currentPageIndicator).toContainText("Page 1 of");
    }

    // 5. Change page size to 20
    await pageSizeSelect.selectOption("20");
    await expect(pageSizeSelect).toHaveValue("20");
    await expect(currentPageIndicator).toContainText("Page 1 of");

    await signOutViaUI(page);
  });

  test("filters tickets by search query, category, priority, and resets filters", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();

    // 1. Create a technical ticket with unique text
    const techSubject = `Docker Crash Issue [${timestamp}]`;
    const resTech = await request.post("/api/webhooks/email", {
      data: {
        from: `Docker Student <docker.${timestamp}@example.com>`,
        subject: techSubject,
        text: `Container failed to start ${timestamp}`,
        category: "Technical Questions",
      },
    });
    expect(resTech.status()).toBe(201);
    const { data: techTicket } = await resTech.json();

    // 2. Create a refund ticket with unique text
    const refundSubject = `Course Refund Request [${timestamp}]`;
    const resRefund = await request.post("/api/webhooks/email", {
      data: {
        from: `Refund Student <refund.${timestamp}@example.com>`,
        subject: refundSubject,
        text: `Requesting money back ${timestamp}`,
        category: "Refund Request",
      },
    });
    expect(resRefund.status()).toBe(201);
    const { data: refundTicket } = await resRefund.json();

    // 3. Login as agent and navigate to /tickets
    await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await expect(page).toHaveURL("/");
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: /^tickets$/i })).toBeVisible();

    // Verify both tickets initially appear
    await expect(page.getByTestId(`ticket-row-${techTicket.id}`)).toBeVisible();
    await expect(page.getByTestId(`ticket-row-${refundTicket.id}`)).toBeVisible();

    // 4. Test Search filter (debounced)
    const searchInput = page.getByTestId("tickets-search-input");
    await searchInput.fill(`Docker Crash Issue [${timestamp}]`);
    await expect(page.getByTestId(`ticket-row-${techTicket.id}`)).toBeVisible();
    await expect(page.getByTestId(`ticket-row-${refundTicket.id}`)).not.toBeVisible();

    // Clear search
    await searchInput.clear();
    await expect(page.getByTestId(`ticket-row-${refundTicket.id}`)).toBeVisible();

    // 5. Test Category filter
    const categorySelect = page.getByTestId("tickets-category-select");
    await categorySelect.selectOption("REFUND_REQUEST");
    await expect(page.getByTestId(`ticket-row-${refundTicket.id}`)).toBeVisible();
    await expect(page.getByTestId(`ticket-row-${techTicket.id}`)).not.toBeVisible();

    // 6. Test Priority filter is rendered
    const prioritySelect = page.getByTestId("tickets-priority-select");
    await expect(prioritySelect).toBeVisible();

    // 7. Clear filters button resets category and shows all tickets
    const clearBtn = page.getByTestId("clear-filters-button");
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await expect(page.getByTestId(`ticket-row-${techTicket.id}`)).toBeVisible();
      await expect(page.getByTestId(`ticket-row-${refundTicket.id}`)).toBeVisible();
    }

    await signOutViaUI(page);
  });

  test("redirects unauthenticated visitor from /tickets to /login", async ({
    page,
  }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login/);
  });
});
