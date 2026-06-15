-- seed_all_page_sections.sql
-- Seeds cms_sections for every non-home page.
-- Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING (by type+pageSlug).
-- Run this on your Postgres DB to populate page sections.

-- ─────────────────────────────────────────────────────────────────────────────
-- SHOP PAGE
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" = 'shop';
INSERT INTO cms_sections (id, type, title, subtitle, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'MembersBanner',  'Members Banner',  'Join KRYROS for exclusive deals', true, 1, 'shop', '{"source":"site-config","key":"members-banner"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'ShopFilters',    'Shop Filters',    'Filter & sort products',           true, 2, 'shop', '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'ProductGrid',    'Product Grid',    'All products listing',             true, 3, 'shop', '{"limit":20}'::jsonb, NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- WHOLESALE PAGE
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" = 'wholesale';
INSERT INTO cms_sections (id, type, title, subtitle, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'WholesaleHero',     'Wholesale Hero',     'Buy More, Save More', true, 1, 'wholesale', '{"source":"site-config","key":"wholesale"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'WholesaleFeatures', 'Wholesale Features', 'Benefits & steps',    true, 2, 'wholesale', '{}'::jsonb, NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- GET-NOW PAGE
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" = 'get-now';
INSERT INTO cms_sections (id, type, title, subtitle, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'GetNowHero',     'Get Now Hero',     'Buy Now, Pay Later', true, 1, 'get-now', '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'GetNowFeatures', 'Get Now Features', 'BNPL benefits',      true, 2, 'get-now', '{}'::jsonb, NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- FAQ PAGE
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" = 'faq';
INSERT INTO cms_sections (id, type, title, subtitle, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'PageHero',    'FAQ Hero',     'Frequently Asked Questions', true, 1, 'faq', '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'FAQAccordion','FAQ Accordion','Questions & answers',        true, 2, 'faq', '{}'::jsonb, NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- CONTACT US PAGE
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" = 'contact-us';
INSERT INTO cms_sections (id, type, title, subtitle, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'PageHero',    'Contact Hero', 'Get in touch with us', true, 1, 'contact-us', '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'ContactForm', 'Contact Form', 'Send us a message',    true, 2, 'contact-us', '{}'::jsonb, NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- ABOUT US PAGE
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" = 'about-us';
INSERT INTO cms_sections (id, type, title, subtitle, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'PageHero',    'About Hero',    'Our story',  true, 1, 'about-us', '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'About Content', 'Who we are', true, 2, 'about-us', '{}'::jsonb, NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT DETAIL PAGE
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" = 'product-detail';
INSERT INTO cms_sections (id, type, title, subtitle, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ProductGallery',  'Product Gallery',  'Images & media',    true, 1, 'product-detail', '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'RelatedProducts', 'Related Products', 'You may also like', true, 2, 'product-detail', '{"limit":6}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'Testimonials',    'Testimonials',     'Customer reviews',  true, 3, 'product-detail', '{}'::jsonb, NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- POLICY / LEGAL PAGES
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM cms_sections WHERE "pageSlug" IN ('terms-conditions','privacy-policy','refund-policy','shipping-policy','track-order','cart','checkout','account','how-it-works');
INSERT INTO cms_sections (id, type, title, "isActive", "order", "pageSlug", config, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'PageContent', 'Terms & Conditions', true, 1, 'terms-conditions', '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'Privacy Policy',     true, 1, 'privacy-policy',   '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'Refund Policy',      true, 1, 'refund-policy',    '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'Shipping Policy',    true, 1, 'shipping-policy',  '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'Track Order',        true, 1, 'track-order',      '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'Cart',               true, 1, 'cart',             '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'Checkout',           true, 1, 'checkout',         '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'My Account',         true, 1, 'account',          '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageHero',    'How It Works Hero',  true, 1, 'how-it-works',     '{}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), 'PageContent', 'How It Works',       true, 2, 'how-it-works',     '{}'::jsonb, NOW(), NOW());

-- Done — verify:
SELECT "pageSlug", COUNT(*) as sections FROM cms_sections GROUP BY "pageSlug" ORDER BY "pageSlug";
