-- Migration: Add IN_TRANSIT and COLLECTED to OrderStatus enum
-- Run this SQL on your PostgreSQL database after deploying the updated schema

-- Add IN_TRANSIT status (order is in the courier vehicle, on the way to pickup station)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';

-- Add COLLECTED status (customer has picked up their order from the pickup station)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'COLLECTED';

-- After running this migration, regenerate the Prisma client:
-- cd Backend && npx prisma generate
