-- Add duration and displayDays columns to cms_banners table
ALTER TABLE "cms_banners" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "cms_banners" ADD COLUMN IF NOT EXISTS "displayDays" INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN "cms_banners"."duration" IS 'Duration in seconds for video banners (carousel timing)';
COMMENT ON COLUMN "cms_banners"."displayDays" IS 'How many days to display this banner (auto-hides after this many days)';
