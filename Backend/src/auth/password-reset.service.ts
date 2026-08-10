import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';

const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 6;
const TOKEN_LENGTH = 32;

@Injectable()
export class PasswordResetService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Generate a secure, one-time password reset token
   * Token expires in 6 hours and can only be used once
   */
  async generateResetToken(userId: string, adminDomain: string, tempPassword?: string): Promise<string> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true },
    });

    if (!user || !user.email) {
      throw new NotFoundException('User not found or email not set');
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    // Generate secure random token
    const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store token in database
    const resetToken = await this.prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    // Generate reset link
    const resetLink = `${adminDomain}/reset-password?token=${token}`;

    // Send email with reset link
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName || user.email.split('@')[0],
      resetLink,
      tempPassword,
    );

    return resetToken.id;
  }

  /**
   * Validate a password reset token
   * Returns user ID if valid, throws error if invalid/expired/used
   */
  async validateResetToken(token: string): Promise<string> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, isActive: true } } },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired password reset link');
    }

    // Check if token has already been used
    if (resetToken.usedAt) {
      throw new BadRequestException('This password reset link has already been used');
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      // Clean up expired token
      await this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      throw new BadRequestException('Password reset link has expired. Please request a new one.');
    }

    // Check if user account is active
    if (!resetToken.user.isActive) {
      throw new BadRequestException('User account is not active');
    }

    return resetToken.user.id;
  }

  /**
   * Complete password reset by marking token as used
   */
  async completePasswordReset(token: string): Promise<void> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid password reset token');
    }

    // Mark token as used (one-time use only)
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
