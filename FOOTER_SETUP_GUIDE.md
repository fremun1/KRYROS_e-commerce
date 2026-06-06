# Footer Management - Setup Guide

## Prerequisites
- Ensure you have a working Prisma setup
- Database connection configured
- NestJS backend running
- Next.js admin panel running

## Step 1: Create Database Migration

Run the Prisma migration to create the footer tables:

```bash
cd Backend

# Generate migration from schema changes
npx prisma migrate dev --name add_footer_management

# Or if already migrated, just push:
npx prisma db push
```

## Step 2: Seed Default Footer Data (Optional)

You can seed with default footer structure by calling:

### Via API (Recommended)
```bash
# Send POST request to seed endpoint with admin token
POST http://localhost:3001/cms/footer/seed
Authorization: Bearer <admin-token>

# Response will be:
{
  "success": true,
  "message": "Footer seeded successfully"
}
```

### Manual Setup
If you prefer manual setup, go to:
1. Admin Panel → CMS → Footer
2. Create sections: Shop, Services, Support, Company
3. Add links to each section
4. Configure footer settings

## Step 3: Verify Installation

1. Check footer displays dynamically on homepage
2. Go to `/admin/cms/footer` in admin panel
3. Edit a footer section/link
4. Verify changes appear on homepage

## What Gets Seeded (If Using Seed Endpoint)

### Default Sections with Links:

**Shop Section:**
- Smartphones → `/shop?category=smartphones`
- Laptops → `/shop?category=laptops`
- Accessories → `/shop?category=accessories`
- Wearables → `/shop?category=wearables`
- Software → `/software`

**Services Section:**
- Phone Repairs → `/services?type=repairs`
- Laptop Repairs → `/services?type=repairs`
- Installation → `/services?type=installation`
- Tech Support → `/services?type=support`
- Consulting → `/services?type=consulting`

**Support Section:**
- Contact Us → `/contact`
- FAQs → `/faq`
- Shipping Info → `/shipping`
- Returns → `/returns`
- Track Order → `/track-order`

**Company Section:**
- About Us → `/about`
- Careers → `/careers`
- Blog → `/blog`
- Privacy Policy → `/privacy`
- Terms → `/terms`

### Default Configuration:
- **Description:** Your trusted source for phones, electronics, accessories, software, and technology services in Zambia and beyond.
- **Contact Phone:** +260 966 423 719
- **Contact Email:** kryrosmobile@gmail.com
- **Contact Address:** Lusaka, Zambia
- **Newsletter Title:** Subscribe to our Newsletter
- **Newsletter Subtitle:** Get the latest deals and updates directly to your inbox
- **Copyright:** © {year} KRYROS MOBILE TECH LIMITED. All rights reserved.
- **Social Links:** Facebook, Twitter, Instagram, LinkedIn, YouTube (placeholders)
- **Payment Methods:** Visa, Mastercard, M-Pesa

## File Changes Summary

### Backend
- ✅ `Backend/prisma/schema.prisma` - Added 3 models
- ✅ `Backend/src/cms/cms.service.ts` - Added footer methods
- ✅ `Backend/src/cms/cms.controller.ts` - Added footer endpoints
- ✅ `Backend/src/cms/dto/` - Added 5 new DTOs

### Frontend (User UI)
- ✅ `Frontend/User-UI/src/components/layout/Footer.tsx` - Now dynamic
- ✅ `Frontend/User-UI/src/app/api/cms/footer/route.ts` - New API route

### Admin Panel
- ✅ `Frontend/Admi-Panel/src/app/admin/cms/footer/page.tsx` - New admin page
- ✅ `Frontend/Admi-Panel/src/app/api/admin/cms/footer/sections/route.ts` - New API route
- ✅ `Frontend/Admi-Panel/src/app/api/admin/cms/footer/sections/[id]/route.ts` - New API route
- ✅ `Frontend/Admi-Panel/src/app/api/admin/cms/footer/links/route.ts` - New API route
- ✅ `Frontend/Admi-Panel/src/app/api/admin/cms/footer/links/[id]/route.ts` - New API route
- ✅ `Frontend/Admi-Panel/src/app/api/admin/cms/footer/config/route.ts` - New API route

## Troubleshooting

### Footer not showing on frontend?
1. Ensure seed/initial data was added
2. Check browser console for fetch errors
3. Verify API route `/api/cms/footer` returns data
4. Check backend logs for errors

### Admin panel shows no sections?
1. Seed the data using `POST /cms/footer/seed`
2. Or manually add sections through the UI
3. Verify admin token is valid

### Changes not appearing on frontend?
1. Check if modifications are set to `isActive: true`
2. Refresh browser page
3. Check network tab to see if fetch is being called
4. Verify backend API is returning updated data

## API Examples

### Get Footer Data (Frontend)
```bash
GET /api/cms/footer

Response:
{
  "sections": [...],
  "config": {...}
}
```

### Create Footer Section (Admin)
```bash
POST /api/admin/cms/footer/sections
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Resources",
  "order": 5,
  "isActive": true
}
```

### Add Footer Link (Admin)
```bash
POST /api/admin/cms/footer/links
Content-Type: application/json
Authorization: Bearer <token>

{
  "sectionId": "section-id-here",
  "label": "Documentation",
  "href": "/docs",
  "order": 0,
  "isActive": true
}
```

### Update Footer Config (Admin)
```bash
PUT /api/admin/cms/footer/config
Content-Type: application/json
Authorization: Bearer <token>

{
  "contactPhone": "+260 777 123 456",
  "contactEmail": "support@kryros.com",
  "description": "Updated description..."
}
```

## Done! 🎉

Your footer is now fully admin-managed! No more hardcoded content. Admins can:
- ✅ Add/remove footer sections
- ✅ Add/remove footer links
- ✅ Edit all footer content
- ✅ Control visibility
- ✅ Update contact info
- ✅ Manage social links
- ✅ Customize payment methods
