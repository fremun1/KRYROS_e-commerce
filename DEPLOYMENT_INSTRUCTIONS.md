# KRYROS Homepage Update — Deployment Instructions

## Overview

This update reorganizes the homepage sections and adds new product recommendation sections. All changes are committed and pushed to `main` on the repository.

## Changes Made

### 1. Homepage Section Order (New)
1. Hero Slider
2. Top Brands
3. Trust Badges
4. Category Section
5. **Flash Sales** *(existing)*
6. **What You Viewed** *(NEW — after Flash Sales, shows products the user recently clicked on)*
7. **Top Selling Items** *(NEW — auto-picked by order count performance)*
8. Upgrade Banner
9. Promo Banners
10. **Newest Arrivals** *(NEW — separate section, sorted by createdAt)*
11. **Best Sellers** *(NEW — separate section, sorted by orderItems count)*
12. **Trending Now** *(NEW — separate section, sorted by orders + wishlists)*
13. Category Promo Banners
14. Recommended For You

### 2. Removed / Replaced
- **Featured Products** tabbed section has been **removed entirely**
- Its four tabs (Flash Deals, Trending, Best Sellers, New Arrivals) are now **separate dedicated sections**

### 3. Product View Tracking
- `ProductPage.tsx` now calls `useRecentlyViewedStore.addProduct()` when a product loads
- This means the **What You Viewed** section will show products only after the user has visited at least one product page

### 4. Admin Panel CMS
- Four new section types are now available in the CMS:
  - **Top Selling** — configure title, CTA text/link, limit, scroll mode
  - **Newest Arrivals** — configure title, CTA text/link, limit, scroll mode
  - **Best Sellers** — configure title, CTA text/link, limit, scroll mode
  - **Trending** — configure title, CTA text/link, limit, scroll mode
- The old "Featured Products" section has been removed from the CMS
- You can toggle each section on/off, reorder them, and configure their display from the Admin Panel CMS

## Deployment Steps (Run on Your Server)

### Step 1: SSH into your DigitalOcean server

```bash
ssh asaphisvm@your-server-ip
```

### Step 2: Pull the latest code

```bash
cd /app && git pull origin main
```

### Step 3: Rebuild the Backend

```bash
cd /app/Backend && npm install && npm run build && pm2 restart backend
```

### Step 4: Rebuild the Admin Panel

```bash
cd /app/Admin-Panel && npm install && npm run build && pm2 restart admin-panel
```

### Step 5: Rebuild the User-UI (Frontend)

```bash
cd /app/User-UI && pnpm install && pnpm build && pm2 restart user-ui
```

### Step 6: Check PM2 status (verify all services are running)

```bash
pm2 status
```

Expected output should show all three services as `online`:
- `backend` on port 4000
- `admin-panel` on port 3001
- `user-ui` on port 3000

### Step 7: Seed new CMS sections (run once)

Go to your Admin Panel CMS (`admin.kryros.com/cms-pages`), find the **Home** page, and either:
- Click **"Reset & Seed"** to regenerate all homepage sections with defaults, OR
- Manually add the new sections: **Top Selling**, **Newest Arrivals**, **Best Sellers**, **Trending**

The backend seed (`cms.service.ts`) will also auto-create these sections if the database is empty on restart.

## Files Changed

| File | Changes |
|------|---------|
| `User-UI/src/pages/HomePage.tsx` | Replaced FeaturedProductsSection with 4 separate sections; moved RecentlyViewed after Flash Sales |
| `User-UI/src/pages/ProductPage.tsx` | Added product view tracking via recentlyViewedStore |
| `User-UI/src/components/home/TopSellingSection.tsx` | NEW — auto-picked top selling products |
| `User-UI/src/components/home/NewestArrivalsSection.tsx` | NEW — newest products by createdAt |
| `User-UI/src/components/home/BestSellersSection.tsx` | NEW — best selling products by order count |
| `User-UI/src/components/home/TrendingSection.tsx` | NEW — trending products by orders + wishlists |
| `Backend/src/cms/cms.service.ts` | Updated seed with new section types; updated order numbers |
| `Admin-Panel/app/cms-pages/page.tsx` | Added CMS field configs, HP_NAME mapping, HP_SECTION_TYPE mapping, and save handlers for new section types |

## Notes

- All new sections use the **standard `UnifiedProductCard`** component — no separate card designs
- All sections are **fully dynamic** — admin can control visibility, order, titles, limits, and scroll mode from the CMS panel
- The **Top Selling Items** section uses the existing `popularity=bestseller` query (sorted by orderItems count)
- The **Newest Arrivals** section uses `popularity=new` (sorted by createdAt desc)
- The **Trending Now** section uses `popularity=trending` (sorted by orderItems count + wishlists count)
