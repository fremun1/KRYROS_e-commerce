-- ============================================================
-- Security migration: refresh tokens + password reset + backfill
-- Run this against your database before deploying the new auth code
-- ============================================================

-- 1. Backfill: mark ALL existing users as verified so no one gets locked out
UPDATE users SET is_verified = true WHERE is_verified = false;

-- 2. Add password reset fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- 3. Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMP   NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 4. Cleanup job helper: expired refresh tokens (run periodically or via cron)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW();
