import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private fromAddress: string;

  constructor(private configService: ConfigService) {
    const host = configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = parseInt(configService.get<string>('SMTP_PORT', '587'), 10);
    const user = configService.get<string>('SMTP_USER');
    const pass = configService.get<string>('SMTP_PASS');
    const fromName = configService.get<string>('EMAIL_FROM_NAME', 'KRYROS Platform');

    const mailFrom = configService.get<string>('MAIL_FROM');
    this.fromAddress = mailFrom || (user ? `"${fromName}" <${user}>` : `"${fromName}" <noreply@kryros.com>`);

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
      this.logger.log(`Email transporter ready (${host}:${port})`);
    } else {
      // Dev fallback: log emails to console instead of sending
      this.transporter = nodemailer.createTransport({ jsonTransport: true } as any);
      this.logger.warn('SMTP_USER / SMTP_PASS not set — emails will be logged, not sent');
    }
  }

  async sendPasswordReset(to: string, rawToken: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL');
    if (!appUrl) {
      this.logger.error('APP_URL/FRONTEND_URL environment variable is missing');
      throw new Error('APP_URL/FRONTEND_URL environment variable is missing');
    }
    const link = `${appUrl}/reset-password?token=${rawToken}`;

    await this.send(to, 'Reset Your KRYROS Password', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#111;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#555;">You requested a password reset for your KRYROS account.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#111;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#999;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
        <p style="color:#ccc;font-size:12px;margin-top:24px;">Or copy this URL: <a href="${link}" style="color:#888;">${link}</a></p>
      </div>
    `);
  }

  async sendEmailVerification(to: string, rawToken: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL');
    if (!appUrl) {
      this.logger.error('APP_URL/FRONTEND_URL environment variable is missing');
      throw new Error('APP_URL/FRONTEND_URL environment variable is missing');
    }
    const link = `${appUrl}/api/auth/verify-email?token=${rawToken}`;

    await this.send(to, 'Verify Your KRYROS Email Address', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#111;margin-bottom:8px;">Welcome to KRYROS 👋</h2>
        <p style="color:#555;">Please verify your email address to activate your account.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#111;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Verify Email
        </a>
        <p style="color:#999;font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.</p>
        <p style="color:#ccc;font-size:12px;margin-top:24px;">Or copy this URL: <a href="${link}" style="color:#888;">${link}</a></p>
      </div>
    `);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      // In dev (jsonTransport), log the email content
      if ((this.transporter as any).options?.jsonTransport) {
        this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
        this.logger.debug(`[DEV EMAIL BODY]: ${html.replace(/<[^>]+>/g, ' ').substring(0, 200)}`);
      } else {
        this.logger.log(`Email sent to ${to} | messageId: ${info.messageId}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
      // Do not throw — email failure should not break the auth flow
    }
  }
}
