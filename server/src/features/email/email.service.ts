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
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      console.warn("⚠️ SMTP credentials not fully configured. Outbound emails will be simulated.");
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } catch (err) {
      console.error("Failed to initialize SMTP transporter:", err);
      this.transporter = null;
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
