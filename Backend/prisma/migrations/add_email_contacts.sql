-- Email Contacts table migration
-- Run this on your Render PostgreSQL database

CREATE TABLE IF NOT EXISTS email_contacts (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT,
  email      TEXT UNIQUE NOT NULL,
  source     TEXT NOT NULL DEFAULT 'Manual',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS email_contacts_email_idx ON email_contacts(email);
