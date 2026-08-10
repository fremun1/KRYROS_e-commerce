import { Controller, Get, Put, Delete, Body, Param, UseGuards, ForbiddenException, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER];

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'showInactive', required: false, type: Boolean })
  findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('showInactive') showInactive?: string,
  ) {
    return this.usersService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: (take || limit) ? Number(take || limit) : undefined,
      search,
      showInactive: showInactive === 'true',
    });
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req) {
    return this.usersService.getUserProfile(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.MANAGER;

    if (!isAdmin) {
      throw new ForbiddenException('You do not have permission to update users');
    }

    // Prevent role changes for non-Super Admins
    if (!isSuperAdmin && updateUserDto.role && (updateUserDto.role === UserRole.SUPER_ADMIN || updateUserDto.role === UserRole.ADMIN || updateUserDto.role === UserRole.MANAGER)) {
      throw new ForbiddenException('Only Super Admins can assign protected roles (Admin, Manager, Super Admin)');
    }

    // Allow Super Admin to update any user, Admins can only update themselves or regular users
    if (!isSuperAdmin && req.user.id !== id) {
      const targetUser = await this.usersService.findById(id);
      if (([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER] as any[]).includes(targetUser.role)) {
        throw new ForbiddenException('Admins can only update regular users, not other admins');
      }
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id') id: string, @Request() req) {
    const targetUser = await this.usersService.findById(id);

    if (req.user.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    
    // Super Admin protection: Cannot delete Super Admin via UI
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin cannot be deleted via UI. Database-only deletion allowed.');
    }

    // Admin can only delete regular users, not other admins
    if (!isSuperAdmin && (targetUser.role === UserRole.ADMIN || targetUser.role === UserRole.MANAGER)) {
      throw new ForbiddenException('Admins can only delete regular users, not other admins or managers');
    }

    return this.usersService.remove(id);
  }
}
