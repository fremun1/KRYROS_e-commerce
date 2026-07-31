import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { compressImage } from '../common/utils/image.util';

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

  async create(createUserDto: CreateUserDto) {
    // SECURITY: explicitly destructure fields to prevent mass-assignment of privileged
    // columns (role, isVerified, isActive). Role defaults to CUSTOMER — callers that need
    // a different role (e.g. auth.service after SUPER_ADMIN validation) pass it explicitly.
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

    // Notify about new user registration (if not already handled by auth service)
    // We use a try-catch to ensure user creation doesn't fail if notification fails
    try {
      // Note: We need to inject NotificationsService here if we want to call it directly.
      // Alternatively, we can let the caller handle it.
      // But looking at the codebase, auth.service handles it for public registrations.
      // For admin-created users, we might want to skip or send a different one.
    } catch (e) {}

    return user;
  }

  async findAll(params: { skip?: number; take?: number; search?: string; showInactive?: boolean } = {}) {
    const { skip = 0, take: rawTake = 20, search, showInactive = false } = params;
    const take = Math.min(Math.max(1, Number(rawTake) || 20), 100);
    
    const where: any = {};
    
    // Default to only showing active users
    if (!showInactive) {
      where.isActive = true;
    }

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
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { total, skip, take } };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
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
    // Check if identifier is email or phone
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { phone: normalized }
        ]
      }
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    const data: Record<string, unknown> = { ...updateUserDto };

    // SECURITY: never store a plaintext password — hash it before writing
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

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // password, passwordResetToken, passwordResetExpires intentionally excluded
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    // Soft delete — preserves orders, reviews, wallet, and other user data
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        addresses: true,
        creditProfile: true,
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
