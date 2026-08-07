# KRYROS E-commerce — Role & Authentication Bug: Root Cause and Fix Report

## Executive Summary

The problem you experienced was **inside the code, not the database**. When you promoted an email to `SUPER_ADMIN`, the promotion worked — the database column was updated correctly, which is why every direct database check showed `SUPER_ADMIN`. However, the backend contained code that **silently overwrote that column on every read** whenever a leftover row existed in a secondary role table (`user_roles`). Between the moment you promoted the account and the moment you logged in again, an API call re-read the user, the stale assignment took over, and your role was silently downgraded. The next login then minted a session token with the downgraded role, so the admin panel treated the account as restricted — exactly the behavior you observed.

The previous AI's diagnosis ("database is fine, it's a cache issue") was incorrect: no cache was involved. The role downgrade happened inside server code, invisibly, with no logs.

## What was wrong, step by step

### 1. Two competing role systems that drift apart

The user model has **two** places where a role can live:

| System | Where | Used by |
|---|---|---|
| Legacy role column | `users.role` (enum: `CUSTOMER`, `ADMIN`, `SUPER_ADMIN`, …) | Login JWT token, all permission guards |
| Granular assignments | `roles` + `user_roles` tables | A newer permission system that was never fully wired up |

The login token is minted exclusively from the `users.role` column (`auth.service.ts` → `buildPayload`), and every permission check (`RolesGuard`) compares that token role with strict equality. So whichever of the two systems "wins" determines what you can do in the panel.

### 2. The silent downgrade (the real bug)

`UsersService.getEffectiveRole()` (in `Backend/src/users/users.service.ts`) computed an "effective" role from the `user_roles` table and then, on **every single read** (`findById`, `findByIdentifier`, `findAll`, `update`, `getUserProfile`), **silently rewrote the `users.role` column** to that computed value if it differed:

> If any row existed in `user_roles` for the user, and that row's role name normalized to `ADMIN`, `MANAGER`, `STAFF`, or `WHOLESALER`, the `users.role` column was overwritten to that lower role — with no log, no notification, nothing visible anywhere.

This explains your exact loop:

1. You promote `kryrosdevelop@gmail.com` to `SUPER_ADMIN` via the admin panel → the enum column becomes `SUPER_ADMIN`. ✅ DB check shows `SUPER_ADMIN`.
2. Somewhere, a stale/low-privilege row exists in `user_roles` for that user (left behind by the granular permission system or a previous migration/script).
3. The next API call reads the user → `getEffectiveRole()` picks the lower role from `user_roles` → the enum column is silently overwritten to that lower role.
4. You log in → the JWT token now carries the downgraded role → the admin panel restricts features → "it happened again."

The promotion itself only ever wrote the enum column; it **never deleted or reconciled** the conflicting `user_roles` row, so the downgrade was guaranteed to recur after every promotion.

### 3. Secondary separation issues (fixed as well)

| Issue | Location | Impact | Fix |
|---|---|---|---|
| `ADMIN_ROLES` included `WHOLESALER`/`WHOLESALE` | `Admin-Panel/contexts/auth-context.tsx` | A wholesale (commercial) account could open the admin panel | Removed; panel is now `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF` only |
| No server-side role check on admin login | `Admin-Panel/app/api/bff/login/route.ts` | Customer tokens could reach panel pages until the frontend logged them out | Login now returns **403** for non-admin roles and sets no cookies |
| Role promotion never reconciled `user_roles` | `users.controller.ts` PUT, `users-management.controller.ts` promote/demote | Promoted accounts kept stale conflicting assignment rows | All role writes now synchronize both systems in one place |

## What was fixed

### Backend (`users.service.ts`)

- **Privilege-preserving role resolution**: the effective role is now the **higher** of the enum column and the assignments — a stale assignment can never downgrade a higher role again.
- **Whitelisted role names only**: unrecognized rows in `user_roles` (garbage, old formats, typos) are ignored instead of producing unpredictable results.
- **Permanent reconciliation on every read and write**: when a role is resolved, any `user_roles` rows that conflict with the effective role are deleted, and a matching assignment is guaranteed to exist. This breaks the downgrade loop for good — even if stale rows still exist today, the first read cleans them up.
- **All role writes are now atomic across both systems**: promoting/demoting/assigning a role through the admin panel updates the enum column *and* the `user_roles` table together, so they can never drift apart again.

### Cleanup script (`Backend/prisma/reconcile-roles.ts`)

A one-time script that walks every user and applies the same reconciliation rules to the live production database: restores any enum column that was silently downgraded, deletes every stale/conflicting `user_roles` row, and de-duplicates. **Run it once right after deploying** (before re-testing your login):

```bash
cd Backend
npx ts-node prisma/reconcile-roles.ts
```

### Admin panel

- `Admin-Panel/app/api/bff/login/route.ts`: server-side role gate — customer and wholesale accounts now get a clear **403 "does not have admin panel access"** at login time, with no session cookies set.
- `Admin-Panel/contexts/auth-context.tsx`: `ADMIN_ROLES` narrowed to `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`.

## Deployment checklist

1. Deploy the updated **Backend** (NestJS) with the fixed `users.service.ts`.
2. Run the cleanup script **once** against the production database:
   `cd Backend && npx ts-node prisma/reconcile-roles.ts`
3. Deploy the updated **Admin-Panel** (Next.js) with the login gate and narrowed roles.
4. **Log out completely** from the admin panel (the old 15-minute JWT may still carry the old role — the access token lives only 15 minutes, so either wait or log out and log back in).
5. Log in as `kryrosdevelop@gmail.com` — the Users & Roles page and every admin feature should now be fully visible.
6. Verify a customer account can no longer reach the admin panel (it will be rejected with 403).

## Why the earlier AI got it wrong

The other AI checked the database at a single moment and saw `SUPER_ADMIN` there, then assumed the database was authoritative. It never noticed that the code *itself* was modifying that column between checks, because the overwrite happens silently inside ordinary read API calls. That is why "clear the cache and refresh" could never fix it — the data being read was genuinely changing.
