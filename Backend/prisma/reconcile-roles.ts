/**
 * Role reconciliation script
 * =========================
 * Fixes the bug where a stale row in the `user_roles` table could silently
 * downgrade a user's `role` column (e.g. SUPER_ADMIN -> ADMIN/CUSTOMER),
 * causing the next login to mint a token with the downgraded role.
 *
 * What this script does for EVERY user:
 * 1. Computes the effective role = HIGHER of (users.role enum, highest
 *    privilege role in user_roles with a whitelisted name).
 * 2. Writes the effective role into the `role` column.
 * 3. Guarantees exactly ONE user_roles row exists for that role and deletes
 *    every other (stale/conflicting) assignment.
 *
 * Run after deploying the code fix, once:
 *   npx ts-node prisma/reconcile-roles.ts
 */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

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

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.CUSTOMER]: 0,
  [UserRole.WHOLESALER]: 1,
  [UserRole.STAFF]: 2,
  [UserRole.MANAGER]: 3,
  [UserRole.ADMIN]: 4,
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.WHOLESALE]: 1,
};

async function main() {
  const users = await prisma.user.findMany({
    include: {
      roleAssignments: { include: { role: true } },
    },
  });

  let fixed = 0;
  let unchanged = 0;

  for (const user of users) {
    const enumRole = user.role ?? UserRole.CUSTOMER;
    let highestAssigned: UserRole | null = null;
    let highestRank = -1;

    for (const assignment of user.roleAssignments) {
      const normalized = normalizeRoleName(assignment.role?.name ?? '');
      if (normalized === null) continue;
      const rank = ROLE_RANK[normalized] ?? 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestAssigned = normalized;
      }
    }

    const effectiveRole =
      highestAssigned !== null && ROLE_RANK[highestAssigned] > ROLE_RANK[enumRole]
        ? highestAssigned
        : enumRole;

    // 1. Sync the enum column if needed.
    if (user.role !== effectiveRole) {
      console.log(
        `[FIX] ${user.email || user.phone || user.id}: role column ${user.role} -> ${effectiveRole}`,
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { role: effectiveRole },
      });
      fixed++;
    }

    // 2. Reconcile user_roles: keep/create only the effective role row.
    const targetName = effectiveRole.toString();
    const existing = user.roleAssignments;
    const targetNameNorm = targetName.toUpperCase().replace(/[\s_]+/g, '');
    const matches = existing.filter((a) =>
      (a.role?.name ?? '').toUpperCase().replace(/[\s_]+/g, '') === targetNameNorm,
    );

    // Delete all non-matching assignments.
    for (const a of existing) {
      const assigned = a.role.name.toUpperCase().replace(/[\s_]+/g, '');
      if (assigned !== targetNameNorm) {
        console.log(
          `[FIX] ${user.email || user.id}: removing stale user_roles row '${a.role.name}'`,
        );
        await prisma.userRoleAssignment.delete({ where: { id: a.id } });
        fixed++;
      }
    }

    // Ensure the matching assignment exists.
    if (effectiveRole !== UserRole.CUSTOMER && matches.length === 0) {
      const roleRow = await prisma.role.upsert({
        where: { name: targetName },
        create: { name: targetName },
        update: {},
      });
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
        create: { userId: user.id, roleId: roleRow.id },
        update: {},
      });
      console.log(
        `[FIX] ${user.email || user.id}: ensured user_roles row '${targetName}' exists`,
      );
      fixed++;
    } else if (matches.length > 1) {
      // De-duplicate duplicate rows for the same role.
      for (const extra of matches.slice(1)) {
        await prisma.userRoleAssignment.delete({ where: { id: extra.id } });
        console.log(`[FIX] ${user.email || user.id}: removed duplicate '${targetName}' row`);
        fixed++;
      }
    }

    unchanged++;
  }

  console.log(`\nDone. Processed ${users.length} users; changes applied: ${fixed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
