-- =============================================================================
-- Checkout Payment Configuration Tables
-- Run this on your Neon PostgreSQL database
-- =============================================================================

CREATE TABLE IF NOT EXISTS "checkout_methods" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checkout_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "checkout_providers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "checkoutMethodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checkout_providers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "checkout_providers_methodId_fkey" FOREIGN KEY ("checkoutMethodId")
        REFERENCES "checkout_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "checkout_networks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checkout_networks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "checkout_networks_providerId_fkey" FOREIGN KEY ("providerId")
        REFERENCES "checkout_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================================
-- Seed default checkout methods (idempotent)
-- These convert every hardcoded value from the frontend into DB-driven config
-- =============================================================================
DO $$
DECLARE
  mobile_id TEXT;
  card_id   TEXT;
  bank_id   TEXT;
  cash_id   TEXT;
  paypal_id TEXT;
  prov_id   TEXT;
BEGIN

  -- 1. MOBILE MONEY (sortOrder=0, enabled)
  SELECT id INTO mobile_id FROM "checkout_methods" WHERE "name" = 'Mobile Money' LIMIT 1;
  IF mobile_id IS NULL THEN
    INSERT INTO "checkout_methods" ("id","name","type","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, 'Mobile Money', 'mobile_wallet', 0, true, CURRENT_TIMESTAMP)
    RETURNING id INTO mobile_id;
  END IF;

  -- Provider: 543 (the mobile money aggregator)
  SELECT id INTO prov_id FROM "checkout_providers" WHERE "checkoutMethodId" = mobile_id AND "name" = '543' LIMIT 1;
  IF prov_id IS NULL THEN
    INSERT INTO "checkout_providers" ("id","checkoutMethodId","name","description","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, mobile_id, '543', 'cGrate / 543 Mobile Money', 0, true, CURRENT_TIMESTAMP)
    RETURNING id INTO prov_id;
  END IF;

  -- Networks under 543
  IF NOT EXISTS (SELECT 1 FROM "checkout_networks" WHERE "providerId" = prov_id AND "name" = 'MTN') THEN
    INSERT INTO "checkout_networks" ("id","providerId","name","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, prov_id, 'MTN', 0, true, CURRENT_TIMESTAMP);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "checkout_networks" WHERE "providerId" = prov_id AND "name" = 'Airtel') THEN
    INSERT INTO "checkout_networks" ("id","providerId","name","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, prov_id, 'Airtel', 1, true, CURRENT_TIMESTAMP);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "checkout_networks" WHERE "providerId" = prov_id AND "name" = 'Zamtel') THEN
    INSERT INTO "checkout_networks" ("id","providerId","name","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, prov_id, 'Zamtel', 2, true, CURRENT_TIMESTAMP);
  END IF;

  -- 2. CREDIT/DEBIT CARD (sortOrder=1, enabled)
  SELECT id INTO card_id FROM "checkout_methods" WHERE "name" = 'Credit/Debit Card' LIMIT 1;
  IF card_id IS NULL THEN
    INSERT INTO "checkout_methods" ("id","name","type","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, 'Credit/Debit Card', 'card', 1, true, CURRENT_TIMESTAMP)
    RETURNING id INTO card_id;
  END IF;

  -- 3. BANK TRANSFER (sortOrder=2, enabled) with Stanbic Bank default account
  SELECT id INTO bank_id FROM "checkout_methods" WHERE "name" = 'Bank Transfer' LIMIT 1;
  IF bank_id IS NULL THEN
    INSERT INTO "checkout_methods" ("id","name","type","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, 'Bank Transfer', 'bank', 2, true, CURRENT_TIMESTAMP)
    RETURNING id INTO bank_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "checkout_providers" WHERE "checkoutMethodId" = bank_id) THEN
    INSERT INTO "checkout_providers" ("id","checkoutMethodId","name","config","sortOrder","isEnabled","updatedAt")
    VALUES (
      gen_random_uuid()::text,
      bank_id,
      'Stanbic Bank Zambia',
      '{"accountName":"KRYROS LIMITED","accountNumber":"91200012345667"}'::jsonb,
      0, true, CURRENT_TIMESTAMP
    );
  END IF;

  -- 4. CASH ON DELIVERY (sortOrder=3, enabled)
  SELECT id INTO cash_id FROM "checkout_methods" WHERE "name" = 'Cash on Delivery' LIMIT 1;
  IF cash_id IS NULL THEN
    INSERT INTO "checkout_methods" ("id","name","type","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, 'Cash on Delivery', 'cash', 3, true, CURRENT_TIMESTAMP)
    RETURNING id INTO cash_id;
  END IF;

  -- 5. PAYPAL (sortOrder=4, disabled by default)
  SELECT id INTO paypal_id FROM "checkout_methods" WHERE "name" = 'PayPal' LIMIT 1;
  IF paypal_id IS NULL THEN
    INSERT INTO "checkout_methods" ("id","name","type","sortOrder","isEnabled","updatedAt")
    VALUES (gen_random_uuid()::text, 'PayPal', 'digital_wallet', 4, false, CURRENT_TIMESTAMP)
    RETURNING id INTO paypal_id;
  END IF;

END $$;
