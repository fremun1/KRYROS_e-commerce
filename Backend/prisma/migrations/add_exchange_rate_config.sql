-- Migration: Add exchange rate configuration table
-- This migration adds a table to store exchange rate provider configuration

CREATE TABLE IF NOT EXISTS "exchange_rate_config" (
    "id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL DEFAULT 'exchangerate-api',
    "primary_api_url" TEXT NOT NULL DEFAULT 'https://api.exchangerate-api.com/v4/latest/USD',
    "fallback_api_url" TEXT NOT NULL DEFAULT 'https://open.er-api.com/v6/latest/USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "update_interval" INTEGER NOT NULL DEFAULT 3600000,
    "last_update" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rate_config_pkey" PRIMARY KEY ("id")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "exchange_rate_config_is_active_idx" ON "exchange_rate_config"("is_active");

-- Insert default configuration
INSERT INTO "exchange_rate_config" ("id", "provider_name", "primary_api_url", "fallback_api_url", "is_active", "update_interval")
VALUES (
    gen_random_uuid()::text,
    'exchangerate-api',
    'https://api.exchangerate-api.com/v4/latest/USD',
    'https://open.er-api.com/v6/latest/USD',
    true,
    3600000
) ON CONFLICT DO NOTHING;
