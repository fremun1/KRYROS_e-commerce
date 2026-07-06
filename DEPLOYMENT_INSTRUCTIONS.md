# KRYROS Homepage Update — Deployment Instructions (Batch 2)

## Overview

This update adds three new product sections, simplifies the Upgrade Banner, and updates the CMS/Admin Panel accordingly. All changes are committed and pushed to `main`.

## New Homepage Section Order

1. Hero Slider
2. Trust Badges
3. Category Section
4. **Flash Sales** *(existing)*
5. **What You Viewed** *(from previous batch)*
6. **Top Selling Items** *(from previous batch)*
7. **Limited Stock Deal** *(NEW — configurable discount %, e.g. "Up to 70% Off")*
8. **Appliances Deal** *(NEW — appliance products)*
9. **Top Express** *(NEW — trending/express products)*
10. **Upgrade Banner** *(simplified — image-only carousel, no text overlay)*
11. Promo Banners
12. Newest Arrivals
13. Best Sellers
14. Trending Now
15. Category Promo Banners
16. Recommended For You

## What Changed

### 1. Limited Stock Deal Section
- Shows products with a configurable discount percentage banner
- Admin controls the discount percent (e.g., 70) from the CMS — the label displays as "Up to 70% Off"
- Products with 20%+ discount show a "Limited Stock" badge
- Uses standard `UnifiedProductCard`

### 2. Appliances Deal Section
- Auto-detects appliance-related categories (fridge, microwave, cooker, etc.) and shows products from them
- Falls back to best-selling products if no appliance category is found
- Uses standard `UnifiedProductCard`

### 3. Top Express Section
- Shows trending products with an express/fast-delivery icon
- Uses standard `UnifiedProductCard`

### 4. Upgrade Banner — Simplified to Image-Only Carousel
- **Removed all text/overlay content** (heading, subtitle, discount text, CTA button)
- Now displays **only images** in a sliding carousel
- Supports **multiple images** — admin uploads them via comma-separated URLs in the CMS
- Images auto-slide every 4 seconds (configurable)
- Shows navigation arrows and dot indicators when multiple images

## Admin Panel CMS — New Section Configs

| Section | CMS Fields |
|---------|-----------|
| **Limited Stock Deal** | Title, Discount Label, Discount Percent, CTA Text, CTA Link, Limit, Scroll |
| **Appliances Deal** | Title, CTA Text, CTA Link, Limit, Scroll |
| **Top Express** | Title, CTA Text, CTA Link, Limit, Scroll |
| **Upgrade Banner** | Title, Images (comma-separated URLs), Auto-slide, Interval (ms) |

## Deployment Steps (Run on Your Server)

```bash
# SSH into server
ssh asaphisvm@your-server-ip

# Pull latest code
cd /app && git fetch origin && git reset --hard origin/main

# Rebuild all services
cd /app/Backend && npm install && npm run build && pm2 restart backend
cd /app/Admin-Panel && npm install && npm run build && pm2 restart admin-panel
cd /app/User-UI && pnpm install && pnpm build && pm2 restart user-ui

# Verify
pm2 status
```

## Files Changed

| File | Changes |
|------|---------|
| `User-UI/src/components/home/LimitedStockDealSection.tsx` | NEW — configurable discount banner + products |
| `User-UI/src/components/home/AppliancesDealSection.tsx` | NEW — appliance products section |
| `User-UI/src/components/home/TopExpressSection.tsx` | NEW — trending/express products |
| `User-UI/src/components/home/UpgradeBanner.tsx` | Rewritten — image-only carousel, no text overlay |
| `User-UI/src/pages/HomePage.tsx` | Updated section order with new sections |
| `Backend/src/cms/cms.service.ts` | Added LimitedStockDeal, AppliancesDeal, TopExpress seeds; updated UpgradeBanner config |
| `Admin-Panel/app/cms-pages/page.tsx` | Added CMS field configs, HP_NAME, HP_SECTION_TYPE, and save handlers for all new sections |

## Notes

- After deploying, go to Admin Panel CMS → Home page and click **"Reset & Seed"** to auto-create the new sections
- For **Upgrade Banner images**: in the CMS, paste comma-separated image URLs (e.g., `https://img1.jpg, https://img2.jpg, https://img3.jpg`). Each URL can optionally include a link by appending `\|URL` (e.g., `https://img1.jpg\|/shop`)
- All sections are fully toggleable, reorderable, and configurable from the Admin Panel
