import { ReactNode } from 'react';
import FlashSaleSection from './FlashSaleSection';
import ProductSection from './ProductSection';
import HeroBannerSection from './HeroBannerSection';
import LimitedStockDealSection from './LimitedStockDealSection';
import TopSellingSection from './TopSellingSection';
import TopExpressSection from './TopExpressSection';

export interface DynamicSection {
  id: string;
  type: string;
  pageSlug: string;
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  order: number;
  isActive: boolean;
  config?: Record<string, any>;
  dedicatedPageSlug?: string;
}

interface DynamicSectionRendererProps {
  section: DynamicSection;
}

/**
 * DynamicSectionRenderer
 * 
 * Renders different section types based on the section.type field.
 * Each section type maps to a specific React component that handles
 * product fetching, filtering, and display.
 */
export default function DynamicSectionRenderer({ section }: DynamicSectionRendererProps): ReactNode {
  if (!section.isActive) {
    return null;
  }

  const { type, title, subtitle, config = {}, dedicatedPageSlug } = section;

  // Determine the view all link
  const viewAllHref = dedicatedPageSlug 
    ? `/shop/${dedicatedPageSlug}` 
    : config.ctaLink || config.viewAllLink || '/shop';

  switch (type) {
    case 'FlashSale':
      return (
        <FlashSaleSection
          title={title || config.title || 'Flash Sales'}
          timerLabel={config.timerLabel || 'TIME LEFT:'}
          ctaText={config.ctaText || 'See All'}
          ctaLink={viewAllHref}
          endTime={config.timerEndDate}
          headerBgColor={config.headerBgColor || '#C1304B'}
          productLimit={config.productLimit || 8}
        />
      );

    case 'ProductGrid':
      return (
        <ProductSection
          title={title || config.heading || 'Products'}
          subtitle={subtitle || config.subheading}
          viewAllHref={viewAllHref}
          params={{
            take: config.productLimit || 8,
            featured: config.filterType === 'Featured',
            popularity: config.filterType === 'Best Selling' ? 'bestseller' : 
                       config.filterType === 'New Arrivals' ? 'new' : undefined,
            categoryId: config.categoryId,
          }}
          limit={config.productLimit || 8}
          accentColor={config.accentColor}
        />
      );

    case 'HeroBanner':
      return (
        <HeroBannerSection
          imageUrl={config.imageUrl}
          title={title}
          subtitle={subtitle}
          buttonText={config.buttonText}
          buttonLink={config.buttonLink}
          duration={config.duration || 5}
        />
      );

    case 'LimitedStockDeal':
      return (
        <LimitedStockDealSection
          title={title || 'Limited Stock Deal'}
          discountText={config.discountText || 'Up to 70% Off'}
          discountPercent={config.discountPercent || 70}
          productLimit={config.productLimit || 8}
          ctaText={config.ctaText || 'Shop Now'}
          ctaLink={viewAllHref}
        />
      );

    case 'TopSelling':
      return (
        <ProductSection
          title={title || 'Top Selling Items'}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          params={{
            take: config.productLimit || 8,
            popularity: 'bestseller',
          }}
          limit={config.productLimit || 8}
          accentColor={config.accentColor}
        />
      );

    case 'TopExpress':
      return (
        <ProductSection
          title={title || 'Top Express Delivery'}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          params={{
            take: config.productLimit || 8,
            popularity: 'trending',
          }}
          limit={config.productLimit || 8}
          accentColor={config.accentColor}
        />
      );

    case 'NewestArrivals':
      return (
        <ProductSection
          title={title || 'Newest Arrivals'}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          params={{
            take: config.productLimit || 8,
            popularity: 'new',
          }}
          limit={config.productLimit || 8}
          accentColor={config.accentColor}
        />
      );

    case 'BestSellers':
      return (
        <ProductSection
          title={title || 'Best Sellers'}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          params={{
            take: config.productLimit || 8,
            popularity: 'bestseller',
          }}
          limit={config.productLimit || 8}
          accentColor={config.accentColor}
        />
      );

    case 'Trending':
      return (
        <ProductSection
          title={title || 'Trending Now'}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          params={{
            take: config.productLimit || 8,
            popularity: 'trending',
          }}
          limit={config.productLimit || 8}
          accentColor={config.accentColor}
        />
      );

    default:
      // Fallback for unknown section types
      console.warn(`Unknown section type: ${type}`);
      return null;
  }
}
