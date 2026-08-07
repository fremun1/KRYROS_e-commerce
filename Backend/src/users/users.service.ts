import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

const BCRYPT_ROUNDS = 12;

function normalizeIdentifier(value?: string | null) {
  const trimmed = value?.trim() || '';
  if (!trimmed) return trimmed;
  if (trimmed.includes('@')) return trimmed.toLowerCase();

  const normalizedPhone = trimmed.replace(/[^\d+]/g, '');
  if (normalizedPhone.startsWith('+')) {
    return `+${normalizedPhone.slice(1).replace(/\D/g, '')}`;
  }

  return normalizedPhone.replace(/\D/g, '');
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  /**
   * Resolves the effective role for a user by checking both the role column
   * and the UserRoleAssignment table. This ensures that roles granted via
   * the granular permission system are reflected in the legacy role enum.
   */
  private getEffectiveRole(user: any): UserRole {
    if (!user.roleAssignments || user.roleAssignments.length === 0) {
      return user.role;
    }

    const assignedRoles = user.roleAssignments.map((a: any) => a.role.name.toUpperCase().replace(/[\s_]+/g, ''));
    
    if (assignedRoles.includes('SUPERADMIN')) return UserRole.SUPER_ADMIN;
    if (assignedRoles.includes('ADMIN')) return UserRole.ADMIN;
    if (assignedRoles.includes('MANAGER')) return UserRole.MANAGER;
    if (assignedRoles.includes('STAFF')) return UserRole.STAFF;
    if (assignedRoles.includes('WHOLESALER') || assignedRoles.includes('WHOLESALE')) return UserRole.WHOLESALER;
    
    return user.role;
  }

  async create(createUserDto: CreateUserDto) {
    const {
      avatar,
      role = UserRole.CUSTOMER,
      captchaToken: _captchaToken,
      country,
      ...coreFields
    } = createUserDto;
    const normalizedEmail =
      typeof coreFields.email === 'string' ? normalizeIdentifier(coreFields.email) : undefined;
    const normalizedPhone =
      typeof coreFields.phone === 'string' ? normalizeIdentifier(coreFields.phone) : undefined;

    let avatarUrl: string | undefined = avatar;
    if (avatar && CloudinaryService.isBase64(avatar)) {
      avatarUrl = await this.cloudinary.uploadImage(avatar, 'kryros/avatars');
    }

    const user = await this.prisma.user.create({
      data: {
        ...coreFields,
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
        role,
        ...(avatarUrl !== undefined ? { avatar: avatarUrl } : {}),
        ...(country !== undefined ? { country } : {}),
      },
    });

    return user;
  }

  async findAll(params: { skip?: number; take?: number; search?: string; showInactive?: boolean } = {}) {
    const { skip = 0, take: rawTake = 20, search, showInactive = false } = params;
    const take = Math.min(Math.max(1, Number(rawTake) || 20), 100);
    
    const where: any = {};
    if (!showInactive) where.isActive = true;

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          roleAssignments: {
            include: {
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Process users to ensure they have the correct effective role
    const processedUsers = await Promise.all(users.map(async (user) => {
      const effectiveRole = this.getEffectiveRole(user);
      if (user.role !== effectiveRole) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: effectiveRole }
        });
        user.role = effectiveRole;
      }
      // Remove sensitive or unnecessary data from the list view if needed
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { roleAssignments, ...rest } = user;
      return { ...rest, role: effectiveRole };
    }));

    return { data: processedUsers, meta: { total, skip, take } };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!user) throw new NotFoundException('User not found');
    
    // Sync legacy role column with role assignments if mismatch found
    const effectiveRole = this.getEffectiveRole(user);
    if (user.role !== effectiveRole) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: effectiveRole }
      });
      user.role = effectiveRole;
    }
    
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: normalizeIdentifier(email) },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone: normalizeIdentifier(phone) },
    });
  }

  async findByIdentifier(identifier: string) {
    const normalized = normalizeIdentifier(identifier);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { phone: normalized }
        ]
      },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    if (user) {
      const effectiveRole = this.getEffectiveRole(user);
      if (user.role !== effectiveRole) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: effectiveRole }
        });
        user.role = effectiveRole;
      }
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    const data: Record<string, unknown> = { ...updateUserDto };

    if (data.password && typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password as string, BCRYPT_ROUNDS);
    }

    if (data.avatar && typeof data.avatar === 'string' &&
        CloudinaryService.isBase64(data.avatar as string)) {
      data.avatar = await this.cloudinary.uploadImage(
        data.avatar as string,
        'kryros/avatars',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    const effectiveRole = this.getEffectiveRole(updatedUser);
    if (updatedUser.role !== effectiveRole) {
      await this.prisma.user.update({
        where: { id: updatedUser.id },
        data: { role: effectiveRole }
      });
      updatedUser.role = effectiveRole;
    }

    return updatedUser;
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        creditProfile: true,
        wallet: true,
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) throw new NotFoundException('User not found');

    const effectiveRole = this.getEffectiveRole(user);
    if (user.role !== effectiveRole) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: effectiveRole }
      });
      user.role = effectiveRole;
    }

    return user;
  }
}
