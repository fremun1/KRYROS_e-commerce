import { ReactNode } from 'react';
import FlashSaleSection from './FlashSaleSection';
import ProductSection from './ProductSection';
import HeroBannerSection from './HeroBannerSection';
import LimitedStockDealSection from './LimitedStockDealSection';
import AppliancesDealSection from './AppliancesDealSection';
import CategoryDealSection from './CategoryDealSection';
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
 * Maps admin-panel section types to React components.
 * All section headers follow Jumia 3-variant system:
 *   Variant 1 (Plain)     — ProductSection: white bg, dark title, primary See All
 *   Variant 2 (Flash)     — FlashSaleSection: colored bar + countdown timer
 *   Variant 3 (Deal)      — LimitedStockDealSection / CategoryDealSection: colored bar + discount subtitle
 *
 * Adding a new category deal section from Admin Panel:
 *   CMS → Dynamic Sections → Create New → Type: CategoryDeal
 *   Set: title, categorySlug, headerBgColor, productLimit, ctaText, ctaLink
 */
export default function DynamicSectionRenderer({ section }: DynamicSectionRendererProps): ReactNode {
  if (!section.isActive) return null;

  const { type, title, subtitle, config = {}, dedicatedPageSlug } = section;

  const viewAllHref = dedicatedPageSlug
    ? `/shop/${dedicatedPageSlug}`
    : config.ctaLink || config.viewAllLink || '/shop';

  switch (type) {

    // ── Variant 2: Flash Sale ─────────────────────────────────
    case 'FlashSale':
      return (
        <FlashSaleSection
          title={title || config.title || 'Flash Sales'}
          timerLabel={config.timerLabel || config.countdownLabel || 'TIME LEFT:'}
          ctaText={config.ctaText || 'See All'}
          ctaLink={viewAllHref}
          endTime={config.timerEndDate || config.endTime}
          headerBgColor={config.headerBgColor || '#C1304B'}
          productLimit={config.productLimit || 8}
        />
      );

    // ── Variant 3: Limited Stock Deal ────────────────────────
    case 'LimitedStockDeal':
      return (
        <LimitedStockDealSection
          title={title || config.title || 'Limited Stock deals'}
          discountText={config.discountText}
          discountPercent={config.discountPercent || 70}
          productLimit={config.productLimit || 8}
          ctaText={config.ctaText || 'See All'}
          ctaLink={viewAllHref}
          headerBgColor={config.headerBgColor || '#0A5858'}
        />
      );

    // ── Variant 3: Appliances Deal ───────────────────────────
    case 'AppliancesDeal':
      return (
        <AppliancesDealSection
          title={title || config.title || 'Appliances deals'}
          subtitleText={subtitle || config.subtitle}
          ctaText={config.ctaText || 'See All'}
          ctaLink={viewAllHref}
          headerBgColor={config.headerBgColor || '#0A5858'}
          productLimit={config.productLimit || 8}
          categorySlug={config.categorySlug}
        />
      );

    // ── Variant 3: Generic Category Deal (Phone deals, etc.) ─
    case 'CategoryDeal':
      return (
        <CategoryDealSection
          title={title || config.title || 'Deals'}
          subtitle={subtitle || config.subtitle}
          categoryId={config.categoryId}
          categorySlug={config.categorySlug}
          headerBgColor={config.headerBgColor || '#0A5858'}
          productLimit={config.productLimit || 8}
          ctaText={config.ctaText || 'See All'}
          ctaLink={viewAllHref}
        />
      );

    // ── Variant 1: Plain sections ─────────────────────────────
    case 'ProductGrid':
      return (
        <ProductSection
          title={title || config.heading || 'Products'}
          subtitle={subtitle || config.subheading}
          viewAllHref={viewAllHref}
          viewAllText={config.ctaText || 'See All'}
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

    case 'TopSelling':
      return (
        <ProductSection
          title={title || 'Top Selling Items'}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          viewAllText={config.ctaText || 'See All'}
          params={{ take: config.productLimit || 8, popularity: 'bestseller' }}
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
          viewAllText={config.ctaText || 'See All'}
          params={{ take: config.productLimit || 8, popularity: 'trending' }}
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
          viewAllText={config.ctaText || 'See All'}
          params={{ take: config.productLimit || 8, popularity: 'new' }}
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
          viewAllText={config.ctaText || 'See All'}
          params={{ take: config.productLimit || 8, popularity: 'bestseller' }}
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
          viewAllText={config.ctaText || 'See All'}
          params={{ take: config.productLimit || 8, popularity: 'trending' }}
          limit={config.productLimit || 8}
          accentColor={config.accentColor}
        />
      );

    default:
      console.warn(`Unknown section type: ${type}`);
      return null;
  }
}
