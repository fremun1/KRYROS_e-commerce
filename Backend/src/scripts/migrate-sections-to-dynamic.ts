/**
 * Migration Script: Migrate existing sections to new dynamic section system
 * 
 * This script safely migrates existing cms_sections records to support the new
 * dynamic section fields (templateType, dataSourceId, slotKey, name).
 * 
 * Run with: npx ts-node src/scripts/migrate-sections-to-dynamic.ts
 * 
 * IMPORTANT: This script preserves all existing data and only adds new fields.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of legacy section types to new template types and data sources
const SECTION_TYPE_MAPPING: Record<string, { templateType: string; dataSourceId?: string; slotKey?: string }> = {
  // Product shelves
  'TopSelling': { templateType: 'ProductShelf', dataSourceId: 'top-selling' },
  'Trending': { templateType: 'ProductShelf', dataSourceId: 'trending-products' },
  'NewestArrivals': { templateType: 'ProductShelf', dataSourceId: 'new-arrivals' },
  'BestSellers': { templateType: 'ProductShelf', dataSourceId: 'top-selling' },
  'FlashSale': { templateType: 'ProductShelf', dataSourceId: 'flash-sales' },
  'FeaturedProducts': { templateType: 'ProductShelf', dataSourceId: 'featured-products' },
  'HotProducts': { templateType: 'ProductShelf', dataSourceId: 'hot-products' },
  'SaleItems': { templateType: 'ProductShelf', dataSourceId: 'sale-items' },
  'CreditEligible': { templateType: 'ProductShelf', dataSourceId: 'credit-eligible' },
  'WholesaleProducts': { templateType: 'ProductShelf', dataSourceId: 'wholesale-products' },

  // Category grids
  'CategoriesGrid': { templateType: 'CategoryGrid', dataSourceId: 'homepage-categories' },
  'Categories': { templateType: 'CategoryGrid', dataSourceId: 'homepage-categories' },
  'CategoryGrid': { templateType: 'CategoryGrid', dataSourceId: 'homepage-categories' },
  'ShopCategories': { templateType: 'CategoryGrid', dataSourceId: 'shop-page-categories' },

  // Banners
  'HeroSlider': { templateType: 'BannerSlot', slotKey: 'homepage-hero-slider' },
  'Hero': { templateType: 'BannerSlot', slotKey: 'homepage-hero-slider' },
  'ShopHero': { templateType: 'BannerSlot', slotKey: 'shop-page-top' },
  'PromoBanners': { templateType: 'BannerSlot', slotKey: 'homepage-mid-page' },
  'MidPageBanner': { templateType: 'BannerSlot', slotKey: 'homepage-mid-page' },
  'UpgradeBanner': { templateType: 'BannerSlot', slotKey: 'homepage-mid-page' },

  // Other types (keep as-is)
  'ShopProductShelf': { templateType: 'ProductShelf' },
  'ShopPromoBanner': { templateType: 'BannerSlot' },
  'MembersBanner': { templateType: 'BannerSlot' },
  'PageHero': { templateType: 'BannerSlot' },
  'ProductGallery': { templateType: 'ProductShelf' },
  'RelatedProducts': { templateType: 'ProductShelf' },
  'Testimonials': { templateType: 'ProductShelf' },
  'FAQAccordion': { templateType: 'Custom' },
  'ContactForm': { templateType: 'Custom' },
  'GetNowFeatures': { templateType: 'Custom' },
  'WholesaleFeatures': { templateType: 'Custom' },
  'PageContent': { templateType: 'Custom' },
};

async function migrateExistingSections() {
  console.log('🚀 Starting section migration...\n');

  try {
    // Get all existing sections
    const allSections = await prisma.cMSSection.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📊 Found ${allSections.length} sections to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    // Process each section
    for (const section of allSections) {
      // Skip if already has templateType (already migrated)
      if (section.templateType) {
        console.log(`⏭️  Skipping section "${section.title}" (ID: ${section.id}) - already migrated`);
        skippedCount++;
        continue;
      }

      // Get mapping for this section type
      const mapping = SECTION_TYPE_MAPPING[section.type] || { templateType: 'Custom' };

      // Update the section with new fields
      await prisma.cMSSection.update({
        where: { id: section.id },
        data: {
          templateType: mapping.templateType,
          dataSourceId: mapping.dataSourceId || null,
          slotKey: mapping.slotKey || null,
          name: section.name || section.title || `${section.type} Section`,
        },
      });

      console.log(`✅ Migrated section "${section.title}" (ID: ${section.id})`);
      console.log(`   Type: ${section.type} → Template: ${mapping.templateType}`);
      if (mapping.dataSourceId) console.log(`   Data Source: ${mapping.dataSourceId}`);
      if (mapping.slotKey) console.log(`   Slot Key: ${mapping.slotKey}`);
      console.log('');

      migratedCount++;
    }

    console.log('\n✨ Migration complete!');
    console.log(`📈 Stats:`);
    console.log(`   - Migrated: ${migratedCount} sections`);
    console.log(`   - Skipped: ${skippedCount} sections (already migrated)`);
    console.log(`   - Total: ${allSections.length} sections`);

    // Verify migration
    const migratedSections = await prisma.cMSSection.findMany({
      where: { templateType: { not: null } },
    });

    console.log(`\n🔍 Verification: ${migratedSections.length}/${allSections.length} sections have templateType set`);

    if (migratedSections.length === allSections.length) {
      console.log('✅ All sections successfully migrated!');
    } else {
      console.log('⚠️  Some sections may not have been fully migrated');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateExistingSections();
