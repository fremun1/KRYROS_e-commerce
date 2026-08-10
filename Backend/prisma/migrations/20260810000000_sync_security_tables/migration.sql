-- Sync security-related database objects with the current Prisma schema.
-- This migration is intentionally idempotent so it can safely repair
-- environments where the code/schema was updated but the database was not.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'AccountStatusEnum'
  ) THEN
    CREATE TYPE "AccountStatusEnum" AS ENUM (
      'ACTIVE',
      'INACTIVE',
      'SUSPENDED',
      'RESTRICTED',
      'BLOCKED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "account_statuses" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AccountStatusEnum" NOT NULL DEFAULT 'ACTIVE',
  "suspendedUntil" TIMESTAMP(3),
  "restrictedUntil" TIMESTAMP(3),
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "account_statuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "targetUserId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "changes" JSONB,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "targetUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "reason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key"
  ON "password_reset_tokens"("token");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx"
  ON "password_reset_tokens"("userId");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx"
  ON "password_reset_tokens"("token");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_expiresAt_idx"
  ON "password_reset_tokens"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "account_statuses_userId_key"
  ON "account_statuses"("userId");

CREATE INDEX IF NOT EXISTS "account_statuses_userId_idx"
  ON "account_statuses"("userId");

CREATE INDEX IF NOT EXISTS "account_statuses_status_idx"
  ON "account_statuses"("status");

CREATE INDEX IF NOT EXISTS "account_statuses_suspendedUntil_idx"
  ON "account_statuses"("suspendedUntil");

CREATE INDEX IF NOT EXISTS "account_statuses_restrictedUntil_idx"
  ON "account_statuses"("restrictedUntil");

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx"
  ON "audit_logs"("userId");

CREATE INDEX IF NOT EXISTS "audit_logs_targetUserId_idx"
  ON "audit_logs"("targetUserId");

CREATE INDEX IF NOT EXISTS "audit_logs_action_idx"
  ON "audit_logs"("action");

CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx"
  ON "audit_logs"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'password_reset_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_statuses_userId_fkey'
  ) THEN
    ALTER TABLE "account_statuses"
      ADD CONSTRAINT "account_statuses_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_userId_fkey'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_targetUserId_fkey'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_targetUserId_fkey"
      FOREIGN KEY ("targetUserId") REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
