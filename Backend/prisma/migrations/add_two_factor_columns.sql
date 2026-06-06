-- ============================================================
-- 2FA migration: add two_factor_secret and two_factor_enabled to users
-- Run this against your database ONCE before or after deploying the backend.
-- Safe to re-run (uses IF NOT EXISTS / idempotent).
-- ============================================================

-- Add two_factor_secret column (nullable text)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Add two_factor_enabled column (boolean, default false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
