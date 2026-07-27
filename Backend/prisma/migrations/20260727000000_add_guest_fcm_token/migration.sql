ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "guestFcmToken" TEXT;

CREATE INDEX IF NOT EXISTS "orders_guestFcmToken_idx"
ON "orders" ("guestFcmToken");
