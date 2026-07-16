# KRYROS System Audit Findings

## 1. Routing & Navigation Issues
- **Informational Pages**: Pages like About, Contact, FAQ, etc., were hardcoded static components in `App.tsx` instead of using `GenericCMSPage`. (Fixed in local session)
- **Sidebar Inconsistency**: The Sidebar category accordion only expands/collapses and does not navigate to the dedicated `/shop/category/:slug` page.
- **BrowsePage Logic**: `BrowsePage.tsx` handles both categories and brands but relies on `fetchPageSections` using a concatenated `pageSlug` (e.g., `category-phones`), which might not match seeded data.

## 2. Section Inner Page (ShopSectionPage) Issues
- **Generic Fallback**: If a section slug doesn't resolve to a CMS section, it falls back to "All Products" with generic metadata.
- **Metadata Mismatch**: Section title, subtitle, and timer are often missing or generic in the inner page because the resolver fails to find the specific section configuration.
- **Filter Mapping**: `ShopSectionPage` has complex logic to map `dataSourceId` and legacy `type` to query params, but it's inconsistent with the backend's `section-rules.ts`.

## 3. Backend CMS & Seeding Issues
- **Resolver Gaps**: `cms.service.ts` -> `getSectionByIdOrSlug` only checks a few fields (`id`, `slotKey`, `dedicatedPageSlug`, `config.sectionSlug`, `config.slug`). If a link uses a different identifier, it fails.
- **Seeding Inconsistency**: `cms.controller.ts` has two seeding endpoints; one is page-aware (`reset-seed`), but the other (`seed/:slug`) ignores the slug and calls a legacy generic seeder.
- **Template Mapping**: Many seeded sections use legacy types (`PageHero`, `WholesaleHero`) that need to be canonicalized to `templateType: 'ContentSection'` for the frontend to render them correctly.

## 4. Product Filtering Issues
- **Brand/Category Slugs**: Backend `ProductsController` was missing explicit support for `brandSlug` and `brandId` in the `findAll` method, leading to unfiltered results. (Fixed in local session)
- **Alias Inconsistency**: Confusion between `featured` and `isFeatured` query params between frontend and backend.

## 5. Renderer Gaps
- **DynamicSectionRendererV2**: Missing cases for some seeded types like `PageHero`, `WholesaleHero`, and `GetNowHero`, which should be mapped to `ContentSection`.
- **ProductShelf**: The "See All" link generation logic in `DynamicSectionRendererV2` is complex and might produce links that don't resolve correctly in the backend.
