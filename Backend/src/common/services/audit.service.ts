import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogData {
  performedBy: string; // Admin user ID
  targetUserId?: string; // User affected by action
  action: string; // USER_CREATED, USER_DELETED, ROLE_CHANGED, etc.
  resource: string; // USER, ROLE, etc.
  resourceId?: string; // ID of affected resource
  changes?: Record<string, unknown>; // Before/after values
  reason?: string; // Why the action was performed
  ipAddress?: string; // IP of requester
  userAgent?: string; // User agent of requester
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an admin action for compliance and security tracking
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.performedBy,
          targetUserId: data.targetUserId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          changes: data.changes as any,
          reason: data.reason,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Log errors but don't throw - audit logging should not block operations
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  async getLogs(params: {
    skip?: number;
    take?: number;
    action?: string;
    performedBy?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { skip = 0, take = 50, action, performedBy, targetUserId, startDate, endDate } = params;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (performedBy) {
      where.userId = performedBy;
    }

    if (targetUserId) {
      where.targetUserId = targetUserId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: Math.min(take, 100), // Max 100 per page
        include: {
          performer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * Get audit logs for a specific user (who performed actions)
   */
  async getLogsForUser(userId: string, params?: { skip?: number; take?: number }) {
    return this.getLogs({
      performedBy: userId,
      ...params,
    });
  }

  /**
   * Get audit logs affecting a specific user (target)
   */
  async getLogsForTargetUser(userId: string, params?: { skip?: number; take?: number }) {
    return this.getLogs({
      targetUserId: userId,
      ...params,
    });
  }
}
