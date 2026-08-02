-- OTP-backed registration staging records
-- Run this against the PostgreSQL database before deploying the OTP registration flow.

CREATE TABLE IF NOT EXISTS pending_registrations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  password      TEXT NOT NULL,
  "firstName"   TEXT NOT NULL,
  "lastName"    TEXT NOT NULL,
  "countryCode" TEXT,
  "otpCode"     TEXT NOT NULL,
  "otpChannel"  TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS pending_registrations_email_idx
  ON pending_registrations(email);

CREATE INDEX IF NOT EXISTS pending_registrations_phone_idx
  ON pending_registrations(phone);

CREATE INDEX IF NOT EXISTS pending_registrations_expires_at_idx
  ON pending_registrations("expiresAt");
