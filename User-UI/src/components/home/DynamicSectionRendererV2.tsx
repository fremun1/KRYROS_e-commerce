/**
 * DynamicSectionRendererV2.tsx
 * 
 * This is an enhanced version of the DynamicSectionRenderer that handles:
 * 1. ProductShelf sections (dataSourceId-based product listings)
 * 2. BannerSlot sections (banners positioned in specific slots)
 * 3. CategoryGridShelf sections (category grids)
 * 4. Legacy sections (for backward compatibility)
 * 
 * It respects the `order` field to display sections in the correct sequence.
 * This ensures all sections are aligned and positioned correctly across all pages.
 */

import { useMemo } from 'react';
import ProductShelf from './ProductShelf';
import BannerSlot from './BannerSlot';
import CategoryGridShelf from './CategoryGridShelf';

interface CMSSection {
  id: string;
  templateType?: string; // e.g., 'ProductShelf', 'BannerSlot', 'CategoryGrid'
  type?: string; // Legacy field for backward compatibility
  dataSourceId?: string; // e.g., 'top-selling', 'trending-products'
  slotKey?: string; // For banners: e.g., 'homepage-hero-slider'
  title?: string;
  subtitle?: string;
  config?: Record<string, any>;
  order: number;
  isActive: boolean;
}

interface DynamicSectionRendererV2Props {
  sections: CMSSection[];
  pageSlug?: string; // e.g., 'homepage', 'shop', 'get-now', 'wholesale'
}

export default function DynamicSectionRendererV2({
  sections,
  pageSlug = 'homepage'
}: DynamicSectionRendererV2Props) {
  // Sort sections by order and filter active ones
  const sortedSections = useMemo(() => {
    return sections
      .filter(s => s.isActive)
      .sort((a, b) => a.order - b.order);
  }, [sections]);

  return (
    <div className="dynamic-section-renderer">
      {sortedSections.map((section) => {
        // Determine which component to render based on templateType or type
        const templateType = section.templateType || section.type;

        switch (templateType) {
          // ─────────────────────────────────────────────────────────────────
          // PRODUCT SHELF SECTIONS
          // ─────────────────────────────────────────────────────────────────
          case 'ProductShelf':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Products'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.limit || 8}
                layout={section.config?.layout || 'horizontal-scroll'}
                cardStyle={section.config?.cardStyle || 'default'}
                viewAllHref={section.config?.viewAllHref || '/shop'}
                viewAllText={section.config?.viewAllText || 'See All'}
                accentColor={section.config?.accentColor}
              />
            );

          // ─────────────────────────────────────────────────────────────────
          // BANNER SLOT SECTIONS
          // ─────────────────────────────────────────────────────────────────
          case 'BannerSlot':
            return (
              <BannerSlot
                key={section.id}
                slotKey={section.slotKey || section.dataSourceId || 'homepage-hero-slider'}
                autoRotate={section.config?.autoRotate || false}
                rotationInterval={section.config?.rotationInterval || 4000}
                className={section.config?.className}
              />
            );

          // ─────────────────────────────────────────────────────────────────
          // CATEGORY GRID SECTIONS
          // ─────────────────────────────────────────────────────────────────
          case 'CategoryGrid':
          case 'CategoryGridShelf':
            return (
              <CategoryGridShelf
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'homepage-categories'}
                limit={section.config?.limit || 12}
                columns={section.config?.columns || 'auto'}
                showProductCount={section.config?.showProductCount || false}
                showViewAll={section.config?.showViewAll || false}
                viewAllHref={section.config?.viewAllHref || '/shop'}
                className={section.config?.className}
              />
            );

          // ─────────────────────────────────────────────────────────────────
          // LEGACY SECTIONS (for backward compatibility)
          // ─────────────────────────────────────────────────────────────────
          case 'FlashSale':
            // Render as ProductShelf with flash-sales data source
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Flash Sales'}
                subtitle={section.subtitle}
                dataSourceId="flash-sales"
                limit={section.config?.limit || 8}
              />
            );

          case 'TopSelling':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Top Selling'}
                subtitle={section.subtitle}
                dataSourceId="top-selling"
                limit={section.config?.limit || 8}
              />
            );

          case 'Trending':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Trending'}
                subtitle={section.subtitle}
                dataSourceId="trending-products"
                limit={section.config?.limit || 8}
              />
            );

          case 'BestSellers':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Best Sellers'}
                subtitle={section.subtitle}
                dataSourceId="top-selling"
                limit={section.config?.limit || 8}
              />
            );

          case 'NewestArrivals':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Newest Arrivals'}
                subtitle={section.subtitle}
                dataSourceId="new-arrivals"
                limit={section.config?.limit || 8}
              />
            );

          case 'CategoriesGrid':
          case 'Categories':
            return (
              <CategoryGridShelf
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                dataSourceId="homepage-categories"
              />
            );

          case 'HeroSlider':
            return (
              <BannerSlot
                key={section.id}
                slotKey="homepage-hero-slider"
                autoRotate={true}
                rotationInterval={4000}
              />
            );

          // ─────────────────────────────────────────────────────────────────
          // UNKNOWN SECTION TYPE
          // ─────────────────────────────────────────────────────────────────
          default:
            console.warn(`Unknown section type: ${templateType}`);
            return null;
        }
      })}
    </div>
  );
}
