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

/**
 * Normalize a role name from the `roles` table into a UserRole enum value.
 * Only whitelisted role names are recognized; anything else is ignored.
 */
function normalizeRoleName(name: string): UserRole | null {
  const key = name.toUpperCase().replace(/[\s_]+/g, '');
  switch (key) {
    case 'SUPERADMIN': return UserRole.SUPER_ADMIN;
    case 'ADMIN': return UserRole.ADMIN;
    case 'MANAGER': return UserRole.MANAGER;
    case 'STAFF': return UserRole.STAFF;
    case 'WHOLESALER':
    case 'WHOLESALE': return UserRole.WHOLESALER;
    default: return null;
  }
}

/**
 * Rank roles by privilege (higher index = higher privilege).
 * Used to resolve conflicts between the legacy `role` column and the
 * granular `user_roles` assignment table.
 */
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.CUSTOMER]: 0,
  [UserRole.WHOLESALER]: 1,
  [UserRole.STAFF]: 2,
  [UserRole.MANAGER]: 3,
  [UserRole.ADMIN]: 4,
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.WHOLESALE]: 1,
};

/**
 * Map a Role row name to the legacy enum value used by the role column.
 * WHOLESALE (alias enum) collapses to WHOLESALER.
 */
const ROLE_ENUM_MAP: Partial<Record<string, UserRole>> = {
  SUPER_ADMIN: UserRole.SUPER_ADMIN,
  ADMIN: UserRole.ADMIN,
  MANAGER: UserRole.MANAGER,
  STAFF: UserRole.STAFF,
  WHOLESALER: UserRole.WHOLESALER,
  WHOLESALE: UserRole.WHOLESALER,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // ── Role resolution ────────────────────────────────────────────────────────

  /**
   * Resolves the effective role for a user by comparing the legacy `role`
   * column with the granular `UserRoleAssignment` rows and keeping the
   * HIGHEST privilege of the two.
   *
   * CRITICAL FIX: the previous implementation could SILENTLY DOWNGRADE a
   * user. If any stale row existed in `user_roles` (e.g. a leftover
   * ADMIN/MANAGER/STAFF assignment), the `users.role` column was silently
   * overwritten to that lower role on every read — destroying a SUPER_ADMIN
   * promotion made through the admin panel and making the next login mint a
   * token with the downgraded role.
   *
   * The new behavior is privilege-preserving:
   * - If assignments exist, take the highest-ranked assigned role.
   * - The effective role is the HIGHER of (enum column, derived assignment).
   * - Only whitelisted role names are considered; unrecognized rows are
   *   ignored instead of falling back unpredictably.
   */
  private getEffectiveRole(user: any): UserRole {
    const enumRole: UserRole = user.role ?? UserRole.CUSTOMER;

    if (!user.roleAssignments || user.roleAssignments.length === 0) {
      return enumRole;
    }

    let highestAssigned: UserRole | null = null;
    let highestRank = -1;
    for (const assignment of user.roleAssignments) {
      const role = assignment.role as { name?: string };
      const normalized = normalizeRoleName(role?.name ?? '');
      if (normalized === null) continue; // ignore unknown/stale role rows
      const rank = ROLE_RANK[normalized] ?? 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestAssigned = normalized;
      }
    }

    if (highestAssigned === null) {
      // Assignments exist but none match a known role — trust the enum column.
      return enumRole;
    }

    // Keep the higher of the two (never downgrade).
    return ROLE_RANK[highestAssigned] > ROLE_RANK[enumRole]
      ? highestAssigned
      : enumRole;
  }

  /**
   * Reconciles the two role systems for a user:
   * 1. Computes the effective role (highest of enum column vs assignments).
   * 2. Persists the effective role into the enum column so the login JWT
   *    (which is minted from the enum column) always reflects reality.
   * 3. Ensures a matching UserRoleAssignment exists for the effective role
   *    and REMOVES any stale/conflicting assignment rows, so a future read
   *    can never downgrade the user again.
   */
  private async reconcileRole(user: { id: string; role: UserRole; roleAssignments?: any[] }) {
    const effectiveRole = this.getEffectiveRole(user);

    // 1. Sync the enum column (used by the JWT payload) if it differs.
    if (user.role !== effectiveRole) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: effectiveRole },
      });
      user.role = effectiveRole;
    }

    // 2. Reconcile user_roles: ensure exactly one assignment matching the
    //    effective role exists; delete everything else. This breaks the
    //    downgrade loop permanently.
    const existing = user.roleAssignments ?? [];
    const targetName = effectiveRole.toString(); // e.g. 'SUPER_ADMIN'
    const targetNameNorm = targetName.toUpperCase().replace(/[\s_]+/g, '');
    const hasTarget = existing.some((a: any) => {
      const assigned = (a.role?.name ?? '').toUpperCase().replace(/[\s_]+/g, '');
      return assigned === targetNameNorm;
    });

    if (!hasTarget) {
      // Create (or re-use) the Role row and assign it. Use `upsert` on the
      // (userId, roleId) unique constraint so two concurrent reads can never
      // throw "A record with this userId, roleId already exists" (Prisma
      // P2002) — a second concurrent request that created the row first is
      // harmless and simply re-uses it.
      const roleRow = await this.prisma.role.upsert({
        where: { name: targetName },
        create: { name: targetName },
        update: {},
      });
      await this.prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
        create: { userId: user.id, roleId: roleRow.id },
        update: {},
      });
    }

    // Delete every assignment that does not match the effective role.
    const keepNames = new Set([targetNameNorm]);
    for (const a of existing) {
      const assigned = ((a.role?.name ?? '') as string).toUpperCase().replace(/[\s_]+/g, '');
      if (!keepNames.has(assigned)) {
        await this.prisma.userRoleAssignment.delete({ where: { id: a.id } }).catch(() => {});
      }
    }

    return effectiveRole;
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

    // Hash password if provided
    const hashedPassword = coreFields.password
      ? await bcrypt.hash(coreFields.password, BCRYPT_ROUNDS)
      : undefined;

    const user = await this.prisma.user.create({
      data: {
        ...coreFields,
        ...(hashedPassword ? { password: hashedPassword } : {}),
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
    const take = Math.min(Math.max(1, Number(rawTake) || 20), 1000);

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
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Process users: compute the effective role and reconcile both role
    // systems so stale assignments can never downgrade anyone again.
    const processedUsers = await Promise.all(
      users.map(async (user) => {
        await this.reconcileRole(user);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { roleAssignments, ...rest } = user;
        return { ...rest, role: user.role };
      }),
    );

    return { data: processedUsers, meta: { total, skip, take } };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    await this.reconcileRole(user);

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
        OR: [{ email: normalized }, { phone: normalized }],
      },
      include: {
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user) {
      // IMPORTANT: at login time the role read here is baked into the JWT.
      // Reconciling guarantees a stale user_roles row can never silently
      // downgrade the token role again.
      await this.reconcileRole(user);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    const data: Record<string, unknown> = { ...updateUserDto };

    if (data.password && typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password as string, BCRYPT_ROUNDS);
    }

    if (
      data.avatar &&
      typeof data.avatar === 'string' &&
      CloudinaryService.isBase64(data.avatar as string)
    ) {
      data.avatar = await this.cloudinary.uploadImage(
        data.avatar as string,
        'kryros/avatars',
      );
    }

    // If a privileged role is being assigned (or cleared), reconcile the
    // granular assignment table too, so both systems stay in sync.
    const roleValue = data.role as UserRole | undefined;
    if (roleValue !== undefined && roleValue !== UserRole.CUSTOMER) {
      const targetName = roleValue.toString();
      const roleRow = await this.prisma.role.upsert({
        where: { name: targetName },
        create: { name: targetName },
        update: {},
      });
      await this.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
      await this.prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: id, roleId: roleRow.id } },
        create: { userId: id, roleId: roleRow.id },
        update: {},
      });
    } else if (roleValue === UserRole.CUSTOMER) {
      // Demoting to CUSTOMER — remove all privileged assignments.
      await this.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });

    await this.reconcileRole(updatedUser);

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
            role: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    await this.reconcileRole(user);

    return user;
  }
}
