import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env";
import { formatReplyText, extractFirstName } from "../tickets/ticket.utils";

export interface SendTicketReplyEmailOptions {
  to: string;
  customerName?: string | null;
  ticketId: number;
  subject: string;
  replyText: string;
  agentName?: string | null;
  inReplyToMessageId?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    if (env.RESEND_API_KEY) {
      console.log("🚀 [Email Service] Configured with Resend HTTPS API for outbound emails (immune to SMTP port blocks).");
      return;
    }

    if (!env.SMTP_USER || !env.SMTP_PASS) {
      console.warn("⚠️ SMTP credentials not fully configured (SMTP_USER or SMTP_PASS is missing). Outbound emails will be simulated.");
      return;
    }

    try {
      const isGmailService = (!env.SMTP_HOST || env.SMTP_HOST === "smtp.gmail.com") && env.SMTP_PORT === 465;

      const transportOptions = isGmailService
        ? {
            service: "gmail",
            auth: {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            },
          }
        : {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            },
            connectionTimeout: 10000,
          };

      this.transporter = nodemailer.createTransport(transportOptions as any);

      // Verify connection on startup to catch auth / firewall / port issues early in server logs
      if (process.env.NODE_ENV !== "test") {
        this.transporter.verify((err) => {
          if (err) {
            console.error("❌ [SMTP Error] Connection verification failed:", err.message);
            if (err.message.includes("ETIMEDOUT") || err.message.includes("ENETUNREACH") || err.message.includes("Greeting never received")) {
              console.error("💡 [Railway SMTP Notice] Connection timed out! Railway blocks outbound SMTP ports 25, 465, and 587 on Free & Hobby plans. To send emails from Railway, add a RESEND_API_KEY (over HTTPS port 443) or upgrade to Railway Pro.");
            } else if (err.message.includes("535") || err.message.includes("Username and Password not accepted")) {
              console.error("💡 [Gmail Auth Notice] Authentication failed (535). Ensure 2-Step Verification is active, generate a 16-character App Password, and verify there are no quotes or extra spaces in your Railway environment variables.");
            }
          } else {
            console.log(`✅ [SMTP Ready] Connected to ${env.SMTP_HOST || "gmail"} on port ${env.SMTP_PORT} (${env.SMTP_USER})`);
          }
        });
      }
    } catch (err) {
      console.error("Failed to initialize SMTP transporter:", err);
      this.transporter = null;
    }
  }

  /**
   * Sends an outbound email using Resend's HTTPS REST API (Port 443).
   * Works on any cloud platform without SMTP port restrictions.
   */
  private async sendWithResend(options: {
    to: string;
    fromHeader: string;
    subject: string;
    body: string;
    inReplyToMessageId?: string | null;
  }): Promise<SendEmailResult> {
    try {
      const headers: Record<string, string> = {};
      if (options.inReplyToMessageId) {
        headers["In-Reply-To"] = options.inReplyToMessageId;
        headers["References"] = options.inReplyToMessageId;
      }

      // Resend does NOT permit sending from public webmail domains (e.g. @gmail.com).
      // If a custom domain is configured in RESEND_FROM (e.g. support@yourcompany.com), use it;
      // otherwise, default to Resend's allowed sandbox address "HelpDesk Support <onboarding@resend.dev>".
      let from = env.RESEND_FROM;
      if (
        !from ||
        from.includes("@gmail.com") ||
        from.includes("@yahoo.com") ||
        from.includes("@outlook.com") ||
        from.includes("@hotmail.com")
      ) {
        from = "HelpDesk Support <onboarding@resend.dev>";
      }

      const replyTo = env.SUPPORT_EMAIL || env.SMTP_USER;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          text: options.body,
          reply_to: replyTo || undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        console.error("❌ [Resend API Error]:", data);
        return {
          success: false,
          error: data.message || `Resend request failed with status ${response.status}`,
        };
      }

      console.log(`✅ [Email Sent via Resend] Delivered reply to ${options.to} (Message ID: ${data.id})`);
      return {
        success: true,
        messageId: data.id,
      };
    } catch (error: any) {
      console.error(`❌ [Resend Delivery Failed] Error sending to ${options.to}:`, error);
      return {
        success: false,
        error: error.message || "Failed to send email via Resend API",
      };
    }
  }

  /**
   * Sends an outbound email reply to the customer with proper threading headers.
   */
  async sendTicketReplyEmail(options: SendTicketReplyEmailOptions): Promise<SendEmailResult> {
    const { to, customerName, ticketId, subject, replyText, agentName, inReplyToMessageId } = options;

    if (!to || !to.trim()) {
      return { success: false, error: "Missing recipient email address." };
    }

    const firstName = extractFirstName(customerName);
    const formattedBody = formatReplyText(replyText, {
      customerFirstName: firstName || undefined,
      signOffName: agentName || "Helpdesk Support Team",
    });

    const replySubject = subject.toLowerCase().startsWith("re:")
      ? subject
      : `Re: ${subject.trim() || `Ticket #${ticketId}`}`;

    const senderAddress = env.SMTP_USER || env.SUPPORT_EMAIL;
    const fromHeader = `"${agentName || "Helpdesk Support"}" <${senderAddress}>`;

    // 1. If RESEND_API_KEY is configured, use Resend HTTPS API (never blocked by Railway)
    if (env.RESEND_API_KEY) {
      return this.sendWithResend({
        to,
        fromHeader,
        subject: replySubject,
        body: formattedBody,
        inReplyToMessageId,
      });
    }

    // 2. Fallback to SMTP or simulation
    if (!this.transporter) {
      console.log(`📧 [Simulated Email] Outbound reply to ${to}:`, {
        from: fromHeader,
        subject: replySubject,
        body: formattedBody,
      });
      return { success: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromHeader,
        to,
        subject: replySubject,
        text: formattedBody,
        inReplyTo: inReplyToMessageId || undefined,
        references: inReplyToMessageId ? [inReplyToMessageId] : undefined,
      });

      console.log(`✅ [Email Sent] Successfully delivered reply to ${to} (Message ID: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error(`❌ [Email Delivery Failed] Error sending to ${to}:`, error);
      return {
        success: false,
        error: error.message || "Failed to send email via SMTP",
      };
    }
  }
}

export const emailService = new EmailService();
