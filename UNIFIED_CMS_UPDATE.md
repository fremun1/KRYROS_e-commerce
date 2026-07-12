# Unified CMS Section Management Update

This update refactors the CMS section management into a unified, generic system as requested. It simplifies the admin panel by providing single buttons for Product, Category, and Brand sections, while maintaining full flexibility through configuration.

## Key Changes

### 1. Backend (NestJS)
- **Updated `section-rules.ts`**: Introduced generic rules for Products, Categories, Brands, and Banners.
- **Enhanced `SectionDataSourceService`**: Added `fetchBrandsByRule` to support the new Brand section.
- **Updated `CMSController`**: Added endpoint `/api/cms/sections/brands-by-source` for the frontend to fetch brand data.
- **Refactored `CMSService`**: 
    - Updated `mapLegacyTypeToTemplate` and `mapLegacyTypeToDataSource` to align old section types with the new generic system.
    - Updated `createSection` to automatically map legacy types to the new system for backward compatibility.
    - Added cache invalidation for section updates.

### 2. Admin Panel (Next.js)
- **Updated Dynamic Sections Page**:
    - Added support for `BrandGrid` template icon.
    - Simplified the "Add Section" flow to focus on generic types.
    - Added new configuration options:
        - **Products**: Toggle Countdown Timer and % Off Badge.
        - **Categories**: Choose between **Grid** and **Horizontal Scroll** layouts.
        - **Brands**: Choose between **Grid** and **Horizontal Scroll** layouts, AND choose between **Full** (Image + Name) and **Minimal** (Name only with auto-scroll) styles.

### 3. Frontend (User-UI)
- **Updated `DynamicSectionRendererV2`**:
    - Now correctly passes `slotKey` to `HeroSection`.
    - Supports the new `BrandGrid` template.
    - Correctly maps `CategorySection` to `CategoryGridShelf` with layout support.
- **Enhanced `ProductShelf`**:
    - Added built-in support for countdown timers (reusing logic from FlashSaleSection).
    - Supports dynamic styling based on configuration.
- **Updated `BrandsSection`**:
    - Now fetches data from the unified backend endpoint.
    - Supports the "Minimal" style (text-only auto-scroll) as requested.

## Deployment Instructions

To apply these changes to your Digital Ocean server, please follow these steps:

1. **Pull the latest changes**:
   ```bash
   cd /app
   git pull origin main
   ```

2. **Rebuild the Backend**:
   ```bash
   cd /app/Backend
   npm install
   npm run build
   pm2 restart backend
   ```

3. **Rebuild the Admin Panel**:
   ```bash
   cd /app/Admin-Panel
   npm install
   npm run build
   pm2 restart admin-panel
   ```

4. **Rebuild the User-UI**:
   ```bash
   cd /app/User-UI
   pnpm install
   pnpm build
   pm2 restart user-ui
   ```

5. **Verify**:
   Go to your Admin Panel -> CMS -> Dynamic Sections. You should now see the simplified section management and new configuration options.
