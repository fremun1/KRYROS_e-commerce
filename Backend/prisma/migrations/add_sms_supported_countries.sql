-- Migration: add_sms_supported_countries
-- Creates the sms_supported_countries table and seeds Zambia as default

CREATE TABLE IF NOT EXISTS "sms_supported_countries" (
  "id"        TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "dialCode"  TEXT        NOT NULL,
  "isoCode"   TEXT        NOT NULL,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sms_supported_countries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sms_supported_countries_dialCode_key"
  ON "sms_supported_countries"("dialCode");

-- Seed Zambia as the default supported country
INSERT INTO "sms_supported_countries" ("id", "name", "dialCode", "isoCode", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Zambia',
  '260',
  'ZM',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("dialCode") DO NOTHING;
