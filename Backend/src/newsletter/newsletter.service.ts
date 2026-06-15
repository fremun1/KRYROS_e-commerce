import { Injectable, ConflictException, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../notifications/mailer.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  private readonly CACHE_TTL = 600000;

  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async subscribe(email: string) {
    const existing = await this.prisma.newsletter.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Email already subscribed');
      }
      const updated = await this.prisma.newsletter.update({
        where: { email },
        data: { isActive: true },
      });
      // Re-send welcome email on re-subscribe
      this.sendWelcomeEmail(email).catch((err) =>
        this.logger.warn(`Welcome email failed for ${email}: ${err?.message}`),
      );
      return updated;
    }

    const created = await this.prisma.newsletter.create({
      data: { email },
    });

    // Send welcome email asynchronously (don't block subscribe response)
    this.sendWelcomeEmail(email).catch((err) =>
      this.logger.warn(`Welcome email failed for ${email}: ${err?.message}`),
    );

    return created;
  }

  async unsubscribe(email: string) {
    return this.prisma.newsletter.update({
      where: { email },
      data: { isActive: false },
    });
  }

  async findAll() {
    return this.prisma.newsletter.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.newsletter.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Send bulk newsletter to given emails (or all active subscribers if none provided) */
  async sendBulkNewsletter(emails: string[], subject: string, body: string): Promise<{ sent: number; failed: number }> {
    const targets = emails.length > 0 ? emails : (await this.findActive()).map((s) => s.email);

    let sent = 0;
    let failed = 0;

    for (const email of targets) {
      try {
        await this.mailerService.sendNewsletterEmail(email, subject, body);
        sent++;
      } catch (err) {
        this.logger.warn(`Newsletter send failed for ${email}: ${err?.message}`);
        failed++;
      }
    }

    this.logger.log(`Newsletter sent: ${sent} success, ${failed} failed`);
    return { sent, failed };
  }

  private async sendWelcomeEmail(email: string): Promise<void> {
    await this.mailerService.sendNewsletterWelcome(email);
  }
}
