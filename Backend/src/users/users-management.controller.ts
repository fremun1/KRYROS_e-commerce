import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditService } from '../common/services/audit.service';
import { AccountStatusService } from '../common/services/account-status.service';
import { PasswordResetService } from '../auth/password-reset.service';

interface AuthenticatedRequest {
  user: { id: string; email: string; role: UserRole };
  headers: Record<string, string | string[] | undefined>;
}

@ApiTags('User Management')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersManagementController {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
    private accountStatusService: AccountStatusService,
    private passwordResetService: PasswordResetService,
  ) {}

  /**
   * Create a new user or admin
   * Super Admin can create Admins and Super Admins
   * Admin can only create regular Users
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new user or admin' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const { role = UserRole.CUSTOMER } = createUserDto;

    // Authorization: Only Super Admin can create Admins/Super Admins
    if (role !== UserRole.CUSTOMER && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can create admin accounts');
    }

    // Create user
    const user = await this.usersService.create(createUserDto);

    // Generate password reset link
    const adminDomain = process.env.ADMIN_DOMAIN || 'https://admin.yourdomain.com';
    // If a password was provided (e.g. from the admin panel's temp password flow),
    // pass it to the reset service so it can be included in the email.
    await this.passwordResetService.generateResetToken(user.id, adminDomain, createUserDto.password);

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: user.id,
      action: 'USER_CREATED',
      resource: 'USER',
      resourceId: user.id,
      changes: {
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      message: 'User created successfully. Password reset link sent to email.',
    };
  }

  /**
   * Promote a user to a higher role
   * Only Super Admin can promote users
   */
  @Put(':id/promote')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Promote user to higher role' })
  async promoteUser(
    @Param('id') userId: string,
    @Body('newRole') newRole: UserRole,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!newRole || !([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as any[]).includes(newRole)) {
      throw new BadRequestException('Invalid role for promotion');
    }

    const user = await this.usersService.findById(userId);

    // Cannot promote Super Admin
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin cannot be promoted');
    }

    // Update user role
    const updatedUser = await this.usersService.update(userId, { role: newRole });

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: userId,
      action: 'USER_PROMOTED',
      resource: 'USER',
      resourceId: userId,
      changes: {
        from: user.role,
        to: newRole,
      },
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      message: `User promoted to ${newRole}`,
    };
  }

  /**
   * Demote a user to a lower role
   * Only Super Admin can demote users
   * Cannot demote Super Admin via UI (database-only)
   */
  @Put(':id/demote')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Demote user to lower role' })
  async demoteUser(
    @Param('id') userId: string,
    @Body('newRole') newRole: UserRole,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!newRole || !([UserRole.CUSTOMER, UserRole.WHOLESALER, UserRole.STAFF] as any[]).includes(newRole)) {
      throw new BadRequestException('Invalid role for demotion');
    }

    const user = await this.usersService.findById(userId);

    // Cannot demote Super Admin via UI
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin cannot be demoted. Database-only deletion allowed.');
    }

    // Update user role
    const updatedUser = await this.usersService.update(userId, { role: newRole });

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: userId,
      action: 'USER_DEMOTED',
      resource: 'USER',
      resourceId: userId,
      changes: {
        from: user.role,
        to: newRole,
      },
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      message: `User demoted to ${newRole}`,
    };
  }

  /**
   * Delete a user (soft delete - mark as inactive)
   * Super Admin can delete anyone (except themselves)
   * Admin can only delete regular Users
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async deleteUser(
    @Param('id') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    // Cannot delete self
    if (userId === req.user.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.usersService.findById(userId);

    // Super Admin protection: Cannot delete Super Admin via UI
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin cannot be deleted via UI. Database-only deletion allowed.');
    }

    // Admin can only delete regular Users, not other Admins
    if (req.user.role === UserRole.ADMIN && ([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as any[]).includes(user.role)) {
      throw new ForbiddenException('Admins can only delete regular users, not other admins');
    }

    // Soft delete
    await this.usersService.remove(userId);
    await this.accountStatusService.deactivate(userId);

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: userId,
      action: 'USER_DELETED',
      resource: 'USER',
      resourceId: userId,
      changes: {
        isActive: false,
      },
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      message: 'User deleted successfully',
    };
  }

  /**
   * Suspend user account temporarily
   * Only Super Admin can suspend
   */
  @Put(':id/suspend')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend user account temporarily' })
  async suspendUser(
    @Param('id') userId: string,
    @Body() body: { durationHours: number; reason?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    if (!body.durationHours || body.durationHours <= 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }

    await this.accountStatusService.suspend(userId, body.durationHours, body.reason);

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: userId,
      action: 'USER_SUSPENDED',
      resource: 'USER',
      resourceId: userId,
      changes: {
        durationHours: body.durationHours,
      },
      reason: body.reason,
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      message: `User suspended for ${body.durationHours} hours`,
    };
  }

  /**
   * Restrict user account temporarily
   * Only Super Admin can restrict
   */
  @Put(':id/restrict')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restrict user account temporarily' })
  async restrictUser(
    @Param('id') userId: string,
    @Body() body: { durationHours: number; reason?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    if (!body.durationHours || body.durationHours <= 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }

    await this.accountStatusService.restrict(userId, body.durationHours, body.reason);

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: userId,
      action: 'USER_RESTRICTED',
      resource: 'USER',
      resourceId: userId,
      changes: {
        durationHours: body.durationHours,
      },
      reason: body.reason,
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      message: `User restricted for ${body.durationHours} hours`,
    };
  }

  /**
   * Block user account permanently
   * Only Super Admin can block
   */
  @Put(':id/block')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Block user account permanently' })
  async blockUser(
    @Param('id') userId: string,
    @Body() body: { reason?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    await this.accountStatusService.block(userId, body.reason);

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: userId,
      action: 'USER_BLOCKED',
      resource: 'USER',
      resourceId: userId,
      reason: body.reason,
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      message: 'User blocked successfully',
    };
  }

  /**
   * Unblock user account
   * Only Super Admin can unblock
   */
  @Put(':id/unblock')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unblock user account' })
  async unblockUser(
    @Param('id') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.accountStatusService.unblock(userId);

    // Log the action
    await this.auditService.log({
      performedBy: req.user.id,
      targetUserId: userId,
      action: 'USER_UNBLOCKED',
      resource: 'USER',
      resourceId: userId,
      ipAddress: req.headers?.['x-forwarded-for'] as string,
      userAgent: req.headers?.['user-agent'] as string,
    });

    return {
      message: 'User unblocked successfully',
    };
  }

  /**
   * Get audit logs for a user
   * Only Super Admin can view audit logs
   */
  @Get(':id/audit-log')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get audit logs for user' })
  async getAuditLog(
    @Param('id') userId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.auditService.getLogsForTargetUser(userId, {
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
  }
}
