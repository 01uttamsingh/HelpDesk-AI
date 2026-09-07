import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI, signOutViaUI } from "../helpers/auth";

test.describe("Inbound Email Webhook to Ticket Conversion", () => {
  // ---------------------------------------------------------------------------
  // 1. Inbound Webhook Ingestion (Happy Path)
  // ---------------------------------------------------------------------------
  test("ingests inbound email with display name and creates a Ticket with integer ID and null category", async ({
    request,
  }) => {
    const timestamp = Date.now();
    const payload = {
      from: `Alice Student <alice.student.${timestamp}@example.com>`,
      to: "support@helpdesk.local",
      subject: `Course Access Issue [${timestamp}]`,
      text: "Hello support, I cannot open video module 2 in the React course.",
      html: "<p>Hello support, I cannot open video module 2 in the React course.</p>",
      messageId: `<msg-${timestamp}@example.com>`,
    };

    const response = await request.post("/api/webhooks/email", {
      data: payload,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    const ticket = body.data;
    // 1. Integer primary key
    expect(typeof ticket.id).toBe("number");
    expect(ticket.id).toBeGreaterThan(0);

    // 2. Required senderName & normalized email
    expect(ticket.senderName).toBe("Alice Student");
    expect(ticket.senderEmail).toBe(`alice.student.${timestamp}@example.com`);

    // 3. Merged message contents
    expect(ticket.subject).toBe(payload.subject);
    expect(ticket.body).toBe(payload.text);
    expect(ticket.htmlBody).toBe(payload.html);
    expect(ticket.messageId).toBe(payload.messageId);

    // 4. Default status OPEN, priority MEDIUM
    expect(ticket.status).toBe("OPEN");
    expect(ticket.priority).toBe("MEDIUM");

    // 5. Category is optional with no default value (null)
    expect(ticket.category).toBeNull();
  });

  test("ingests inbound email with bare address and derives required senderName", async ({
    request,
  }) => {
    const timestamp = Date.now();
    const payload = {
      from: `john.doe.${timestamp}@example.com`,
      subject: `Billing Question [${timestamp}]`,
      text: "Can I receive an invoice for my subscription?",
    };

    const response = await request.post("/api/webhooks/email", {
      data: payload,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    expect(body.success).toBe(true);
    const ticket = body.data;
    expect(typeof ticket.id).toBe("number");
    expect(ticket.senderName).toContain("John Doe");
    expect(ticket.senderEmail).toBe(`john.doe.${timestamp}@example.com`);
    expect(ticket.category).toBeNull();
  });

  test("ingests inbound email with category enum and persists TicketCategory correctly", async ({
    request,
  }) => {
    const timestamp = Date.now();
    const payload = {
      from: `Bob Developer <bob.${timestamp}@example.com>`,
      subject: `Technical Question [${timestamp}]`,
      text: "How do I configure the Docker container?",
      category: "Technical Questions",
    };

    const response = await request.post("/api/webhooks/email", {
      data: payload,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.category).toBe("TECHNICAL_QUESTION");
  });

  // ---------------------------------------------------------------------------
  // 2. Payload Validation & Error Handling
  // ---------------------------------------------------------------------------
  test("rejects inbound email missing body text with 400 Bad Request", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks/email", {
      data: {
        from: "user@example.com",
        subject: "No content message",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation error");
  });

  test("rejects inbound email with invalid from address format", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks/email", {
      data: {
        from: "",
        subject: "Subject",
        text: "Some body text",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 3. Ticket Retrieval by Authenticated Agent
  // ---------------------------------------------------------------------------
  test("allows authenticated agent to retrieve created ticket by integer ID", async ({
    page,
    request,
  }) => {
    // 1. Ingest ticket via webhook
    const timestamp = Date.now();
    const createRes = await request.post("/api/webhooks/email", {
      data: {
        from: `Sarah Student <sarah.${timestamp}@example.com>`,
        subject: `Password Reset Request [${timestamp}]`,
        text: "Please send me a password reset link.",
      },
    });
    expect(createRes.status()).toBe(201);
    const { data: createdTicket } = await createRes.json();

    // 2. Agent logs in
    await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password);
    await expect(page).toHaveURL("/");

    // 3. Fetch ticket by integer ID via authenticated API
    const ticketRes = await page.request.get(`/api/tickets/${createdTicket.id}`);
    expect(ticketRes.status()).toBe(200);
    const { data: fetchedTicket } = await ticketRes.json();

    expect(fetchedTicket.id).toBe(createdTicket.id);
    expect(fetchedTicket.senderName).toBe("Sarah Student");
    expect(fetchedTicket.senderEmail).toBe(`sarah.${timestamp}@example.com`);
    expect(fetchedTicket.subject).toBe(`Password Reset Request [${timestamp}]`);
    expect(fetchedTicket.category).toBeNull();

    // 4. Verify 404 for non-existent ticket ID
    const notFoundRes = await page.request.get("/api/tickets/9999999");
    expect(notFoundRes.status()).toBe(404);

    // 5. Verify 400 for invalid non-integer ticket ID
    const invalidIdRes = await page.request.get("/api/tickets/abc-invalid");
    expect(invalidIdRes.status()).toBe(400);

    await signOutViaUI(page);
  });
});
