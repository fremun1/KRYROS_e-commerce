-- Migration: add_pickup_stations_and_new_fields
-- Run this SQL on your PostgreSQL database

-- 1. Add country to brands
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- 2. Add shippingEnabled to countries  
ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "shippingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- 3. Add extra fields to shipping_zones
ALTER TABLE "shipping_zones" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "shipping_zones" ADD COLUMN IF NOT EXISTS "shippingMethod" TEXT;
ALTER TABLE "shipping_zones" ADD COLUMN IF NOT EXISTS "rate" DECIMAL(10, 2);
ALTER TABLE "shipping_zones" ADD COLUMN IF NOT EXISTS "minOrder" DECIMAL(10, 2);

-- 4. Add extra fields to wholesale_accounts
ALTER TABLE "wholesale_accounts" ADD COLUMN IF NOT EXISTS "tierName" TEXT;
ALTER TABLE "wholesale_accounts" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "wholesale_accounts" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "wholesale_accounts" ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(10, 2);

-- 5. Create pickup_stations table
CREATE TABLE IF NOT EXISTS "pickup_stations" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "address"      TEXT NOT NULL,
  "city"         TEXT NOT NULL,
  "state"        TEXT,
  "country"      TEXT NOT NULL DEFAULT 'Zambia',
  "latitude"     DOUBLE PRECISION,
  "longitude"    DOUBLE PRECISION,
  "phone"        TEXT,
  "email"        TEXT,
  "openingHours" TEXT,
  "description"  TEXT,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pickup_stations_pkey" PRIMARY KEY ("id")
);

-- 6. Create wholesale_deals table
CREATE TABLE IF NOT EXISTS "wholesale_deals" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "accountId"   TEXT,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "discount"    DECIMAL(5, 2),
  "minOrder"    DECIMAL(10, 2),
  "validUntil"  TIMESTAMP(3),
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wholesale_deals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wholesale_deals_accountId_fkey" FOREIGN KEY ("accountId") 
    REFERENCES "wholesale_accounts"("id") ON DELETE SET NULL
);

-- Done! Run "npx prisma generate" and restart the backend after applying.
