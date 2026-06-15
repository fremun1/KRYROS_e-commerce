-- Cleanup orphaned homepage_sections rows
-- These types are NOT rendered by any frontend component:
--   HeroSlider: HeroSection reads directly from cms_banners API (fetchBanners())
--   Brands:     BrandsSection reads from cms_site_configs key='trusted-brands'

DELETE FROM homepage_sections WHERE type = 'HeroSlider';
DELETE FROM homepage_sections WHERE type = 'Brands';

-- Verify cleanup
SELECT type, COUNT(*) as count FROM homepage_sections GROUP BY type ORDER BY type;
