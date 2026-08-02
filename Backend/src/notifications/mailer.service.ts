import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// ─── Email Styles (shared across all templates) ────────────────────────────────
const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f0f4f8; color: #1a202c; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
  .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
  .header { background: #344a64; padding: 32px 36px; text-align: center; }
  .logo { font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
  .logo span { color: #C0151B; }
  .tagline { font-size: 11px; color: #6b8da8; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px; }
  .body { padding: 32px 36px; }
  .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
  .text { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px; }
  .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 20px; }
  .order-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; margin: 20px 0; }
  .order-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .order-row:last-child { border-bottom: none; }
  .order-label { color: #64748b; }
  .order-value { font-weight: 600; color: #0f172a; }
  .cta-btn { display: block; width: fit-content; margin: 24px auto; padding: 14px 32px; background: linear-gradient(135deg, #C0151B, #A01015); color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; text-align: center; }
  .divider { height: 1px; background: #f1f5f9; margin: 24px 0; }
  .footer { padding: 20px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; }
  .footer-text { font-size: 11px; color: #94a3b8; line-height: 1.6; }
  .footer-brand { font-weight: 700; color: #C0151B; }
  .contact-info { font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.4; }
`;

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get('SMTP_HOST');
    const port = this.configService.get('SMTP_PORT');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: { user, pass },
        // Prefer IPv4 to avoid ENETUNREACH errors with IPv6
        ...({ dnsPriority: 'ipv4' } as any),
      });
      this.logger.log('Mailer Service initialized with SMTP (IPv4 preferred)');
    } else {
      this.logger.warn('SMTP configuration incomplete. Mailer Service disabled.');
    }
  }

  get isConfigured(): boolean {
    return !!this.transporter;
  }

  // ─── Core send method ─────────────────────────────────────────────────────
  async sendMail(to: string, subject: string, text: string, html?: string) {
    if (!this.transporter) {
      this.logger.error(`Email FAILED (SMTP not configured): ${subject} → ${to}`);
      throw new Error('SMTP service not configured. Please contact administrator.');
    }
    const from = this.configService.get('MAIL_FROM') || '"KRYROS Mobile" <kryrosmobile@gmail.com>';
    try {
      const info = await this.transporter.sendMail({ from, to, subject, text, html });
      this.logger.log(`Email sent successfully: ${info.messageId} → ${to}`);
      return info;
    } catch (error) {
      this.logger.error(`SMTP Error for ${to}: [${error.code}] ${error.message}`);
      if (error.response) this.logger.error(`SMTP Response: ${error.response}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // ─── Template: Order Confirmation ─────────────────────────────────────────
  buildOrderConfirmationHtml(params: {
    firstName: string;
    orderNumber: string;
    total: string;
    currency: string;
    paymentMethod: string;
    shippingAddress?: string;
    trackingUrl?: string;
  }): string {
    const { firstName, orderNumber, total, currency, paymentMethod, shippingAddress, trackingUrl } = params;
    const appUrl = this.configService.get('FRONTEND_URL');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Order Received - KRYROS</title><style>${BASE_STYLES}</style></head>
<body><div class="wrapper"><div class="card">
  <div class="header">
    <div class="logo">KR<span>YROS</span></div>
    <div class="tagline">Mobile · Commerce · Tech</div>
  </div>
  <div class="body">
    <div class="greeting">Order Received! 🎉</div>
    <p class="text">Hi <strong>${firstName}</strong>, thank you for shopping with KRYROS! Your order has been received and this email serves as your order summary / invoice.</p>
    <div class="order-box">
      <div class="order-row"><span class="order-label">Order Number</span><span class="order-value">#${orderNumber}</span></div>
      <div class="order-row"><span class="order-label">Total Amount</span><span class="order-value">${currency} ${total}</span></div>
      <div class="order-row"><span class="order-label">Payment Method</span><span class="order-value">${paymentMethod}</span></div>
      ${shippingAddress ? `<div class="order-row"><span class="order-label">Shipping To</span><span class="order-value">${shippingAddress}</span></div>` : ''}
      <div class="order-row"><span class="order-label">Status</span><span class="order-value" style="color:#f59e0b">⏳ Pending Confirmation</span></div>
    </div>
    <p class="text">If payment still needs verification, we will automatically send your final payment receipt once it is confirmed. You can also track your order any time using the button below.</p>
    <a href="${trackingUrl || appUrl}" class="cta-btn">Track My Order →</a>
    <div class="divider"></div>
    <p class="text" style="font-size:12px;color:#94a3b8">Questions? We're here to help! Reply to this email or contact our support team at +260 969 597 029 or support@kryros.com</p>
  </div>
  <div class="footer"><p class="footer-text">© 2026 <span class="footer-brand">KRYROS Mobile Tech Limited</span><br>Secure · Trusted · Fast</p><p class="contact-info">📞 +260 969 597 029 | 📧 support@kryros.com | 🌐 www.kryros.com</p></div>
</div></div></body></html>`;
  }

  // ─── Template: Order Status Update ────────────────────────────────────────
  buildOrderStatusHtml(params: {
    firstName: string;
    orderNumber: string;
    status: string;
    statusMessage: string;
    statusEmoji: string;
    statusColor: string;
    trackingUrl?: string;
  }): string {
    const { firstName, orderNumber, status, statusMessage, statusEmoji, statusColor, trackingUrl } = params;
    const appUrl = this.configService.get('FRONTEND_URL');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Order Update - KRYROS</title><style>${BASE_STYLES}</style></head>
<body><div class="wrapper"><div class="card">
  <div class="header">
    <div class="logo">KR<span>YROS</span></div>
    <div class="tagline">Order Update</div>
  </div>
  <div class="body">
    <div class="greeting">${statusEmoji} ${status}</div>
    <p class="text">Hi <strong>${firstName}</strong>, here's an update on your order.</p>
    <div class="order-box">
      <div class="order-row"><span class="order-label">Order Number</span><span class="order-value">#${orderNumber}</span></div>
      <div class="order-row"><span class="order-label">New Status</span><span class="order-value" style="color:${statusColor}">${statusEmoji} ${status}</span></div>
    </div>
    <p class="text">${statusMessage}</p>
    <a href="${trackingUrl || appUrl}" class="cta-btn">View Order Details →</a>
    <div class="divider"></div>
    <p class="text" style="font-size:12px;color:#94a3b8">Questions? We're here to help! Reply to this email or contact our support team at +260 969 597 029 or support@kryros.com</p>
  </div>
  <div class="footer"><p class="footer-text">© 2026 <span class="footer-brand">KRYROS Mobile Tech Limited</span><br>Secure · Trusted · Fast</p><p class="contact-info">📞 +260 969 597 029 | 📧 support@kryros.com | 🌐 www.kryros.com</p></div>
</div></div></body></html>`;
  }

  // ─── Template: Announcement / Promotional ─────────────────────────────────
  buildAnnouncementHtml(params: {
    firstName: string;
    subject: string;
    headline: string;
    bodyHtml: string;
    ctaText?: string;
    ctaUrl?: string;
  }): string {
    const { firstName, subject, headline, bodyHtml, ctaText, ctaUrl } = params;
    const appUrl = this.configService.get('FRONTEND_URL');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject} - KRYROS</title><style>${BASE_STYLES}</style></head>
<body><div class="wrapper"><div class="card">
  <div class="header">
    <div class="logo">KR<span>YROS</span></div>
    <div class="tagline">From the KRYROS Team</div>
  </div>
  <div class="body">
    <div class="greeting">${headline}</div>
    <p class="text">Hi <strong>${firstName || 'Valued Customer'}</strong>,</p>
    <div style="font-size:14px;color:#475569;line-height:1.8;margin-bottom:20px">${bodyHtml}</div>
    ${ctaText ? `<a href="${ctaUrl || appUrl}" class="cta-btn">${ctaText} →</a>` : ''}
    <div class="divider"></div>
    <p class="text" style="font-size:12px;color:#94a3b8">Questions? We're here to help! Contact us at +260 969 597 029 or support@kryros.com</p>
  </div>
  <div class="footer"><p class="footer-text">© 2026 <span class="footer-brand">KRYROS Mobile Tech Limited</span><br>Secure · Trusted · Fast</p><p class="contact-info">📞 +260 969 597 029 | 📧 support@kryros.com | 🌐 www.kryros.com</p></div>
</div></div></body></html>`;
  }

  // ─── Convenience: Send Order Confirmation ────────────────────────────────
  async sendOrderConfirmationEmail(params: {
    to: string;
    firstName: string;
    orderNumber: string;
    total: string;
    currency: string;
    paymentMethod: string;
    shippingAddress?: string;
    trackingUrl?: string;
  }) {
    const html = this.buildOrderConfirmationHtml(params);
    return this.sendMail(
      params.to,
      `Order Received #${params.orderNumber} - KRYROS`,
      `Hi ${params.firstName}, your order #${params.orderNumber} has been received. Total: ${params.currency} ${params.total}.`,
      html,
    );
  }

  // ─── Convenience: Send Order Status Email ────────────────────────────────
  async sendOrderStatusEmail(params: {
    to: string;
    firstName: string;
    orderNumber: string;
    status: string;
    trackingUrl?: string;
  }) {
    const statusMap: Record<string, { label: string; message: string; emoji: string; color: string }> = {
      CONFIRMED:  { label: 'Order Confirmed',      emoji: '✅', color: '#C0151B', message: 'Your order has been confirmed and our team is preparing it for dispatch. Thank you for choosing KRYROS!' },
      PROCESSING: { label: 'Processing Your Order', emoji: '📦', color: '#6366f1', message: 'We\'re currently processing your order with care. You\'ll hear from us as soon as it ships.' },
      SHIPPED:    { label: 'Order Shipped',         emoji: '🚚', color: '#3b82f6', message: 'Great news! Your order is on its way to you. We\'ll update you when it\'s close to delivery.' },
      OUT_FOR_DELIVERY: { label: 'Out for Delivery', emoji: '🏃', color: '#f59e0b', message: 'Your order is out for delivery today. Please be available to receive it. We\'re excited to get this to you!' },
      DELIVERED:  { label: 'Order Delivered',       emoji: '🏠', color: '#10b981', message: 'Your order has been successfully delivered. We hope you love your purchase! If you have any issues, please let us know.' },
      CANCELLED:  { label: 'Order Cancelled',       emoji: '❌', color: '#ef4444', message: 'We sincerely apologize, but your order has been cancelled. If this was in error or you have any questions, please contact our support team and we\'ll be happy to assist you.' },
      REFUNDED:   { label: 'Refund Processed',      emoji: '💰', color: '#8b5cf6', message: 'Your refund has been processed successfully. Please allow 3-5 business days for it to reflect in your account. Thank you for your patience.' },
    };

    const info = statusMap[params.status] || {
      label: `Order ${params.status}`,
      emoji: '📋',
      color: '#64748b',
      message: `Your order #${params.orderNumber} status has been updated to ${params.status}.`,
    };

    const html = this.buildOrderStatusHtml({
      firstName: params.firstName,
      orderNumber: params.orderNumber,
      status: info.label,
      statusMessage: info.message,
      statusEmoji: info.emoji,
      statusColor: info.color,
      trackingUrl: params.trackingUrl,
    });

    return this.sendMail(
      params.to,
      `${info.emoji} ${info.label} - Order #${params.orderNumber}`,
      `Hi ${params.firstName}, your order #${params.orderNumber} is now ${info.label.toLowerCase()}.`,
      html,
    );
  }

  // ─── Convenience: Send Announcement ─────────────────────────────────────
  async sendAnnouncementEmail(params: {
    to: string;
    firstName: string;
    subject: string;
    headline: string;
    bodyHtml: string;
    ctaText?: string;
    ctaUrl?: string;
  }) {
    const html = this.buildAnnouncementHtml(params);
    return this.sendMail(params.to, params.subject, params.headline, html);
  }
  // ─── Newsletter: Welcome Email ────────────────────────────────────────────
  async sendNewsletterWelcome(email: string): Promise<void> {
    const appUrl = this.configService.get('FRONTEND_URL');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Welcome to KRYROS Newsletter</title><style>${BASE_STYLES}
  .nl-highlight { background: linear-gradient(135deg, #C0151B22, #A0101511); border: 1px solid #C0151B44; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
  .nl-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; margin-bottom: 10px; }
  .nl-item:last-child { margin-bottom: 0; }
  .nl-dot { width: 8px; height: 8px; border-radius: 50%; background: #C0151B; flex-shrink: 0; }
</style></head>
<body><div class="wrapper"><div class="card">
  <div class="header">
    <div class="logo">KR<span>YROS</span></div>
    <div class="tagline">You're on the list!</div>
  </div>
  <div class="body">
    <div class="greeting">Welcome to KRYROS Updates!</div>
    <p class="text">You've successfully subscribed to the <strong>KRYROS Newsletter</strong>. You'll be the first to know about exclusive deals, new arrivals, and special offers.</p>
    <div class="nl-highlight">
      <div class="nl-item"><div class="nl-dot"></div><span>Early access to flash sales &amp; promotions</span></div>
      <div class="nl-item"><div class="nl-dot"></div><span>New product announcements</span></div>
      <div class="nl-item"><div class="nl-dot"></div><span>Exclusive subscriber-only discounts</span></div>
      <div class="nl-item"><div class="nl-dot"></div><span>Tech tips and buying guides</span></div>
    </div>
    <a href="${appUrl}" class="cta-btn">Shop KRYROS Now →</a>
    <div class="divider"></div>
    <p class="text" style="font-size:12px;color:#94a3b8">Questions? We're here to help! Contact us at +260 969 597 029 or support@kryros.com</p>
  </div>
  <div class="footer"><p class="footer-text">© 2026 <span class="footer-brand">KRYROS Mobile Tech Limited</span><br>Secure · Trusted · Fast</p><p class="contact-info">📞 +260 969 597 029 | 📧 support@kryros.com | 🌐 www.kryros.com</p></div>
</div></div></body></html>`;

    await this.sendMail(
      email,
      'Welcome to KRYROS Newsletter!',
      'You have successfully subscribed to the KRYROS Newsletter. Stay tuned for the latest deals and updates.',
      html,
    );
  }

  // ─── Newsletter: Bulk Send ────────────────────────────────────────────────
  async sendNewsletterEmail(to: string, subject: string, body: string): Promise<void> {
    const appUrl = this.configService.get('FRONTEND_URL');
    // Convert plain text body to basic HTML paragraphs
    const bodyHtml = body
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => `<p class="text">${line}</p>`)
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject} - KRYROS</title><style>${BASE_STYLES}</style></head>
<body><div class="wrapper"><div class="card">
  <div class="header">
    <div class="logo">KR<span>YROS</span></div>
    <div class="tagline">KRYROS Newsletter</div>
  </div>
  <div class="body">
    <div class="greeting">${subject}</div>
    ${bodyHtml}
    <a href="${appUrl}" class="cta-btn">Shop Now →</a>
    <div class="divider"></div>
    <p class="text" style="font-size:12px;color:#94a3b8">Questions? We're here to help! Contact us at +260 969 597 029 or support@kryros.com</p>
  </div>
  <div class="footer"><p class="footer-text">© 2026 <span class="footer-brand">KRYROS Mobile Tech Limited</span><br>Secure · Trusted · Fast</p><p class="contact-info">📞 +260 969 597 029 | 📧 support@kryros.com | 🌐 www.kryros.com</p></div>
</div></div></body></html>`;

    await this.sendMail(to, subject, body, html);
  }
}
