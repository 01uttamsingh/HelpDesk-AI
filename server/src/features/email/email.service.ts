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
  private gmailAccessToken: string | null = null;
  private gmailAccessTokenExpiresAt: number = 0;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) {
      console.log("🚀 [Email Service] Configured with Google Gmail REST API (HTTPS port 443, sends directly from your Gmail to any recipient).");
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
              console.error("💡 [Railway SMTP Notice] Connection timed out! Railway blocks outbound SMTP ports 25, 465, and 587 on Free & Hobby plans. Use Google Gmail REST API (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) over HTTPS port 443 or upgrade to Railway Pro.");
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
   * Fetches or refreshes the OAuth2 access token for the Gmail REST API.
   */
  private async getGmailAccessToken(): Promise<string> {
    if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
      throw new Error("Gmail API credentials missing (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN).");
    }

    if (this.gmailAccessToken && Date.now() < this.gmailAccessTokenExpiresAt) {
      return this.gmailAccessToken;
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: env.GMAIL_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    const data = (await tokenResponse.json()) as any;
    if (!tokenResponse.ok || !data.access_token) {
      throw new Error(
        `Failed to refresh Google OAuth token: ${data.error_description || data.error || tokenResponse.statusText}`
      );
    }

    this.gmailAccessToken = data.access_token;
    this.gmailAccessTokenExpiresAt = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
    return this.gmailAccessToken;
  }

  /**
   * Sends an outbound email directly from your Gmail account via Google's HTTPS REST API.
   * Runs over Port 443 (HTTPS), completely bypassing Railway's SMTP firewall block.
   */
  private async sendWithGmailApi(options: {
    to: string;
    fromAddress: string;
    fromName: string;
    subject: string;
    body: string;
    inReplyToMessageId?: string | null;
  }): Promise<SendEmailResult> {
    try {
      const accessToken = await this.getGmailAccessToken();

      const headers: string[] = [
        `From: "${options.fromName}" <${options.fromAddress}>`,
        `To: <${options.to}>`,
        `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=UTF-8`,
        `Content-Transfer-Encoding: 7bit`,
      ];

      if (options.inReplyToMessageId) {
        headers.push(`In-Reply-To: ${options.inReplyToMessageId}`);
        headers.push(`References: ${options.inReplyToMessageId}`);
      }

      const rawEmail = `${headers.join("\r\n")}\r\n\r\n${options.body}`;
      const encodedRaw = Buffer.from(rawEmail).toString("base64url");

      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedRaw }),
      });

      const result = (await response.json()) as any;

      if (!response.ok) {
        console.error("❌ [Gmail API Delivery Failed]:", result);
        return {
          success: false,
          error: result?.error?.message || `Gmail API request failed with HTTP ${response.status}`,
        };
      }

      console.log(`✅ [Email Sent via Gmail API] Delivered reply to ${options.to} (Message ID: ${result.id})`);
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error: any) {
      console.error(`❌ [Gmail API Delivery Failed] Error sending to ${options.to}:`, error);
      return {
        success: false,
        error: error.message || "Failed to send email via Google Gmail REST API",
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

    // 1. If Google Gmail REST API credentials are configured, use it (HTTPS Port 443, sends directly from your Gmail to ANY recipient!)
    if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) {
      return this.sendWithGmailApi({
        to,
        fromAddress: senderAddress,
        fromName: agentName || "Helpdesk Support",
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
