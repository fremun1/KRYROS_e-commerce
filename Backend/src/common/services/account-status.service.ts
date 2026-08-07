import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

export enum AccountStatusType {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  RESTRICTED = 'RESTRICTED',
  BLOCKED = 'BLOCKED',
}

@Injectable()
export class AccountStatusService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Get current account status
   */
  async getStatus(userId: string) {
    let status = await this.prisma.accountStatus.findUnique({
      where: { userId },
    });

    if (!status) {
      // Create default ACTIVE status if doesn't exist
      status = await this.prisma.accountStatus.create({
        data: {
          userId,
          status: AccountStatusType.ACTIVE,
        },
      });
    }

    // Check if suspension/restriction has expired
    const now = new Date();
    if (status.status === AccountStatusType.SUSPENDED && status.suspendedUntil && now > status.suspendedUntil) {
      // Auto-unlock suspended account
      status = await this.prisma.accountStatus.update({
        where: { userId },
        data: {
          status: AccountStatusType.ACTIVE,
          suspendedUntil: null,
        },
      });
    }

    if (status.status === AccountStatusType.RESTRICTED && status.restrictedUntil && now > status.restrictedUntil) {
      // Auto-unlock restricted account
      status = await this.prisma.accountStatus.update({
        where: { userId },
        data: {
          status: AccountStatusType.ACTIVE,
          restrictedUntil: null,
        },
      });
    }

    return status;
  }

  /**
   * Check if user can access the system
   */
  async canAccess(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status.status === AccountStatusType.ACTIVE;
  }

  /**
   * Suspend account temporarily (user cannot log in)
   */
  async suspend(userId: string, durationHours: number, reason?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const suspendedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    await this.prisma.accountStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: AccountStatusType.SUSPENDED,
        suspendedUntil,
        reason,
      },
      update: {
        status: AccountStatusType.SUSPENDED,
        suspendedUntil,
        reason,
      },
    });

    // Send notification email
    if (user.email) {
      await this.emailService.sendAccountSuspendedEmail(
        user.email,
        user.firstName,
        durationHours,
        reason,
      );
    }
  }

  /**
   * Restrict account temporarily (limited access)
   */
  async restrict(userId: string, durationHours: number, reason?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const restrictedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    await this.prisma.accountStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: AccountStatusType.RESTRICTED,
        restrictedUntil,
        reason,
      },
      update: {
        status: AccountStatusType.RESTRICTED,
        restrictedUntil,
        reason,
      },
    });

    // Send notification email
    if (user.email) {
      await this.emailService.sendAccountRestrictedEmail(
        user.email,
        user.firstName,
        durationHours,
        reason,
      );
    }
  }

  /**
   * Block account permanently (manual unblock required)
   */
  async block(userId: string, reason?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.accountStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: AccountStatusType.BLOCKED,
        reason,
      },
      update: {
        status: AccountStatusType.BLOCKED,
        reason,
      },
    });

    // Send notification email
    if (user.email) {
      await this.emailService.sendAccountBlockedEmail(user.email, user.firstName, reason);
    }
  }

  /**
   * Unblock account
   */
  async unblock(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.accountStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: AccountStatusType.ACTIVE,
      },
      update: {
        status: AccountStatusType.ACTIVE,
        suspendedUntil: null,
        restrictedUntil: null,
        reason: null,
      },
    });

    // Send notification email
    if (user.email) {
      await this.emailService.sendAccountUnblockedEmail(user.email, user.firstName);
    }
  }

  /**
   * Activate inactive account
   */
  async activate(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.accountStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: AccountStatusType.ACTIVE,
      },
      update: {
        status: AccountStatusType.ACTIVE,
      },
    });

    // Send notification email
    if (user.email) {
      await this.emailService.sendAccountActivatedEmail(user.email, user.firstName);
    }
  }

  /**
   * Deactivate account (soft delete)
   */
  async deactivate(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.accountStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: AccountStatusType.INACTIVE,
      },
      update: {
        status: AccountStatusType.INACTIVE,
      },
    });

    // Send notification email
    if (user.email) {
      await this.emailService.sendAccountDeactivatedEmail(user.email, user.firstName);
    }
  }
}
