-- Add credit installment configuration fields to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "credit_installment_frequency" TEXT DEFAULT 'weekly';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "credit_installment_count" INTEGER DEFAULT 13;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "credit_installment_amount" DECIMAL(10,2);
