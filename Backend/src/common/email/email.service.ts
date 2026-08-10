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

    this.fromAddress = user ? `"${fromName}" <${user}>` : `"${fromName}" <noreply@kryros.com>`;

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
    const appUrl = this.configService.get<string>('APP_URL', 'https://kryros.com');
    const link = `${appUrl}/forgot-password?token=${rawToken}`;

    await this.send(to, 'Reset Your KRYROS Password', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#313133;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#555;">You requested a password reset for your KRYROS account.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#C0151B;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#999;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
        <p style="color:#ccc;font-size:12px;margin-top:24px;">Or copy this URL: <a href="${link}" style="color:#888;">${link}</a></p>
      </div>
    `);
  }

  // Alias for compatibility with password-reset.service.ts
  async sendPasswordResetEmail(to: string, firstName: string, link: string, tempPassword?: string): Promise<void> {
    const content = tempPassword
      ? `
        <h2 style="color:#313133;margin-bottom:8px;">Hi ${firstName},</h2>
        <p style="color:#555;">An admin account has been created for you on the KRYROS Platform.</p>
        <div style="margin:24px 0;padding:16px;background:#fff;border:1px solid #eee;border-radius:6px;">
          <p style="margin:0 0 8px 0;color:#888;font-size:13px;">Temporary Password:</p>
          <span style="font-size:20px;font-weight:bold;color:#C0151B;font-family:monospace;">${tempPassword}</span>
        </div>
        <p style="color:#555;">You can log in with this temporary password or use the link below to set your own password immediately:</p>
        <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#C0151B;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Set Your Password
        </a>
      `
      : `
        <h2 style="color:#313133;margin-bottom:8px;">Hi ${firstName},</h2>
        <p style="color:#555;">You requested a password reset for your KRYROS account.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#C0151B;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
      `;

    await this.send(to, tempPassword ? 'Your KRYROS Admin Account' : 'Reset Your KRYROS Password', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        ${content}
        <p style="color:#999;font-size:13px;margin-top:24px;">This link expires in <strong>6 hours</strong>. If you didn't request this, ignore this email.</p>
        <p style="color:#ccc;font-size:12px;margin-top:24px;">Or copy this URL: <a href="${link}" style="color:#888;">${link}</a></p>
      </div>
    `);
  }

  async sendAccountSuspendedEmail(to: string, firstName: string, durationHours: number, reason?: string): Promise<void> {
    await this.send(to, 'Your KRYROS account has been suspended', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff1f0;border:1px solid #ffa39e;border-radius:8px;">
        <h2 style="color:#cf1322;">Account Suspended</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been temporarily suspended for <strong>${durationHours} hours</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you believe this is an error, please contact support.</p>
      </div>
    `);
  }

  async sendAccountRestrictedEmail(to: string, firstName: string, durationHours: number, reason?: string): Promise<void> {
    await this.send(to, 'Your KRYROS account has been restricted', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff7e6;border:1px solid #ffd591;border-radius:8px;">
        <h2 style="color:#d46b08;">Account Restricted</h2>
        <p>Hi ${firstName},</p>
        <p>Your account access has been restricted for <strong>${durationHours} hours</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Some features may be unavailable during this time.</p>
      </div>
    `);
  }

  async sendAccountBlockedEmail(to: string, firstName: string, reason?: string): Promise<void> {
    await this.send(to, 'Your KRYROS account has been blocked', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#595959;color:#fff;border-radius:8px;">
        <h2 style="color:#fff;">Account Blocked</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been permanently blocked.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>You can no longer access the KRYROS platform.</p>
      </div>
    `);
  }

  async sendAccountUnblockedEmail(to: string, firstName: string): Promise<void> {
    await this.send(to, 'Your KRYROS account has been unblocked', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:8px;">
        <h2 style="color:#389e0d;">Account Restored</h2>
        <p>Hi ${firstName},</p>
        <p>Good news! Your account has been unblocked. You can now log in and use the platform normally.</p>
      </div>
    `);
  }

  async sendAccountActivatedEmail(to: string, firstName: string): Promise<void> {
    await this.send(to, 'Your KRYROS account is active', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:8px;">
        <h2 style="color:#389e0d;">Account Activated</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been activated successfully.</p>
      </div>
    `);
  }

  async sendAccountDeactivatedEmail(to: string, firstName: string): Promise<void> {
    await this.send(to, 'Your KRYROS account has been deactivated', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f5f5f5;border-radius:8px;">
        <h2 style="color:#595959;">Account Deactivated</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been deactivated. If you didn't request this, please contact support.</p>
      </div>
    `);
  }

  async sendEmailVerification(to: string, rawToken: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'https://kryros.com');
    const link = `${appUrl}/api/auth/verify-email?token=${rawToken}`;

    await this.send(to, 'Verify Your KRYROS Email Address', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#313133;margin-bottom:8px;">Welcome to KRYROS 👋</h2>
        <p style="color:#555;">Please verify your email address to activate your account.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#C0151B;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Verify Email
        </a>
        <p style="color:#999;font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.</p>
        <p style="color:#ccc;font-size:12px;margin-top:24px;">Or copy this URL: <a href="${link}" style="color:#888;">${link}</a></p>
      </div>
    `);
  }

  async sendOtp(to: string, code: string): Promise<void> {
    await this.send(to, `${code} is your KRYROS verification code`, `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#313133;margin-bottom:8px;">Verification Code</h2>
        <p style="color:#555;">Use the code below to complete your registration or login.</p>
        <div style="margin:24px 0;padding:16px;background:#fff;border:1px solid #eee;border-radius:6px;text-align:center;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#C0151B;">${code}</span>
        </div>
        <p style="color:#999;font-size:13px;">This code expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
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
