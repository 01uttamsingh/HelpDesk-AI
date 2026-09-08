import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("Ticket Lifecycle - End-to-End Workflow", () => {
  test("integrates inbound webhook creation, agent browser reply, customer email follow-up, and thread persistence", async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const studentEmail = `student.${timestamp}@example.com`;
    const initialSubject = `React 19 Vite Configuration Question [${timestamp}]`;
    const initialBody = "Hello, I am getting a build error with React 19.";
    const agentReplyText = `Hello! Please update your @tailwindcss/vite plugin to the latest version. [${timestamp}]`;
    const customerFollowUpText = `Thanks! That resolved the build error. [${timestamp}]`;

    // -------------------------------------------------------------------------
    // 1. Inbound Webhook: External student email creates a new Ticket in PostgreSQL
    // -------------------------------------------------------------------------
    const createRes = await request.post("/api/webhooks/email", {
      data: {
        from: `Student Sam <${studentEmail}>`,
        subject: initialSubject,
        text: initialBody,
        category: "Technical Questions",
      },
    });
    expect(createRes.status()).toBe(201);
    const { data: ticket } = await createRes.json();
    expect(ticket.id).toBeDefined();

    // -------------------------------------------------------------------------
    // 2. Agent Workflow: Log in via browser, view ticket details, and submit reply
    // -------------------------------------------------------------------------
    await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await expect(page).toHaveURL("/");

    await page.goto(`/tickets/${ticket.id}`);

    // Verify ticket content rendered in UI
    await expect(page.getByTestId("ticket-detail-subject")).toHaveText(initialSubject);
    await expect(page.getByTestId("ticket-sender-name")).toHaveText("Student Sam");
    await expect(page.getByTestId("ticket-detail-body")).toContainText(initialBody);

    // Agent posts reply in UI
    const replyInput = page.getByTestId("reply-body-input");
    await expect(replyInput).toBeVisible();
    await replyInput.fill(agentReplyText);
    await page.getByTestId("submit-reply-button").click();

    // Verify Agent reply rendered in conversation thread
    await expect(page.getByTestId("replies-thread")).toBeVisible();
    await expect(page.getByText(agentReplyText)).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Customer Follow-up: Webhook receives email reply with "Re: " subject
    // -------------------------------------------------------------------------
    const replyWebhookRes = await request.post("/api/webhooks/email", {
      data: {
        from: `Student Sam <${studentEmail}>`,
        subject: `Re: ${initialSubject}`,
        text: customerFollowUpText,
      },
    });
    expect(replyWebhookRes.status()).toBe(201);
    const { data: replyData } = await replyWebhookRes.json();
    expect(replyData.isReply).toBe(true);
    expect(replyData.id).toBe(ticket.id);

    // -------------------------------------------------------------------------
    // 4. Persistence & Browser Verification: Reload page and verify full conversation
    // -------------------------------------------------------------------------
    await page.reload();

    // Both Agent reply and Customer reply should be visible in the thread
    await expect(page.getByTestId("replies-thread")).toBeVisible();
    await expect(page.getByText(agentReplyText)).toBeVisible();
    await expect(page.getByText(customerFollowUpText)).toBeVisible();

    // Verify customer badge on follow-up
    await expect(page.getByText("Customer").first()).toBeVisible();

    await signOutViaUI(page);
  });
});
