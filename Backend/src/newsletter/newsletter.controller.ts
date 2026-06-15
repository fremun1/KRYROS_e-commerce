import { Controller, Post, Body, Get, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NewsletterService } from './newsletter.service';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async subscribe(@Body('email') email: string) {
    if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
      throw new BadRequestException('A valid email address is required');
    }
    return this.newsletterService.subscribe(email.toLowerCase().trim());
  }

  @Post('unsubscribe')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async unsubscribe(@Body('email') email: string) {
    if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
      throw new BadRequestException('A valid email address is required');
    }
    return this.newsletterService.unsubscribe(email.toLowerCase().trim());
  }

  @Get('list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async list() {
    return this.newsletterService.findAll();
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async active() {
    return this.newsletterService.findActive();
  }

  /** Admin: send newsletter to specific emails or ALL active subscribers */
  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async send(
    @Body('subject') subject: string,
    @Body('body') body: string,
    @Body('emails') emails?: string[],
  ) {
    if (!subject?.trim()) {
      throw new BadRequestException('Subject is required');
    }
    if (!body?.trim()) {
      throw new BadRequestException('Body is required');
    }
    const targets = Array.isArray(emails) ? emails.filter(Boolean) : [];
    return this.newsletterService.sendBulkNewsletter(targets, subject.trim(), body.trim());
  }
}
