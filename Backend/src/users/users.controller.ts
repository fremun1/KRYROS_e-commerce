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
    @Query('search') search?: string,
    @Query('showInactive') showInactive?: string,
  ) {
    return this.usersService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
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

    if (req.user.id !== id && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this user');
    }

    if (!isSuperAdmin) {
      const { firstName, lastName, email, phone, avatar } = updateUserDto;
      return this.usersService.update(id, { firstName, lastName, email, phone, avatar });
    }

    if (!isSuperAdmin && updateUserDto.role && (updateUserDto.role === UserRole.SUPER_ADMIN || updateUserDto.role === UserRole.ADMIN || updateUserDto.role === UserRole.MANAGER)) {
      throw new ForbiddenException('Only Super Admins can assign protected roles (Admin, Manager, Super Admin)');
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id') id: string, @Request() req) {
    const targetUser = await this.usersService.findById(id);

    if (req.user.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin && (targetUser.role === UserRole.SUPER_ADMIN || targetUser.role === UserRole.ADMIN || targetUser.role === UserRole.MANAGER)) {
      throw new ForbiddenException('Only Super Admins can delete users with protected roles (Admin, Manager, Super Admin)');
    }

    return this.usersService.remove(id);
  }
}
