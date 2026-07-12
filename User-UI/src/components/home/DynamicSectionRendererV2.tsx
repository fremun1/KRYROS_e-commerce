/**
 * DynamicSectionRendererV2.tsx
 * 
 * Clean renderer organized into 7 generic families:
 * 1. BANNER      — HeroBanner, PromoBanner, BannerSlot
 * 2. PRODUCT     — ProductShelf (all variants)
 * 3. CATEGORY    — CategoryGrid, CategorySection
 * 4. BRAND       — BrandsSection
 * 5. CONTENT     — Hero, RichText, FAQ, ContactForm, FeaturesGrid, Gallery
 * 6. UTILITY     — Testimonials, RecentlyViewed, Newsletter, ContentSection
 * 7. DEAL        — FlashSale, LimitedStockDeal, AppliancesDeal, CategoryDeal, TopExpress
 * 
 * Each family maps multiple legacy section types into a single canonical component.
 * The `default` branch renders unknown types as raw JSON for safe debugging.
 */

import { useMemo } from 'react';
import ProductShelf from './ProductShelf';
import CategoryGridShelf from './CategoryGridShelf';
import BrandsSection from './BrandsSection';
import CategorySection from './CategorySection';
import FlashSaleSection from './FlashSaleSection';
import LimitedStockDealSection from './LimitedStockDealSection';
import AppliancesDealSection from './AppliancesDealSection';
import CategoryDealSection from './CategoryDealSection';
import RecentlyViewedSection from './RecentlyViewedSection';
import PromoBanners from './PromoBanners';
import HeroSection from './HeroSection';
import TopExpressSection from './TopExpressSection';
import BannerSlot from './BannerSlot';
import PromoBanner from './PromoBanner';
import NewsletterSection from './NewsletterSection';
import TestimonialsSection from './TestimonialsSection';
import ContentSection from './ContentSection';

interface CMSSection {
  id: string;
  templateType?: string;
  type?: string;
  dataSourceId?: string;
  slotKey?: string;
  title?: string;
  subtitle?: string;
  config?: Record<string, any>;
  order: number;
  isActive: boolean;
}

interface DynamicSectionRendererV2Props {
  sections: CMSSection[];
  pageSlug?: string;
}

export default function DynamicSectionRendererV2({
  sections,
  pageSlug = 'homepage'
}: DynamicSectionRendererV2Props) {
  const sortedSections = useMemo(() => {
    return sections
      .filter(s => s.isActive)
      .sort((a, b) => a.order - b.order);
  }, [sections]);

  return (
    <div className="dynamic-section-renderer">
      {sortedSections.map((section) => {
        const templateType = section.templateType || section.type;

        // ═══════════════════════════════════════════════════════════════════
        // FAMILY 1: BANNER (HeroBanner, PromoBanner, BannerSlot)
        // ═══════════════════════════════════════════════════════════════════
        switch (templateType) {
          case 'HeroBanner':
          case 'HeroSlider':
            return (
              <HeroSection key={section.id} />
            );

          case 'BannerSlot':
            return (
              <BannerSlot
                key={section.id}
                bannerMode={section.config?.bannerMode || 'hero'}
                tag={section.config?.tag}
                slotKey={section.slotKey || section.dataSourceId || 'homepage-hero-slider'}
              />
            );

          case 'PromoBanner':
            return (
              <PromoBanner
                key={section.id}
                tag={section.config?.tag}
                title={section.title || section.config?.heading}
                subtitle={section.subtitle || section.config?.subtitle}
                cta={section.config?.ctaText || section.config?.button_text}
                href={section.config?.ctaLink || section.config?.href || section.config?.button_link}
                image={section.config?.image || section.config?.media}
                gradient={section.config?.gradient || section.config?.bgColor}
              />
            );

          case 'PromoBanners':
          case 'Promotions':
          case 'promo_banners':
            return <PromoBanners key={section.id} />;

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 2: PRODUCT (all product shelf variants)
          // ═══════════════════════════════════════════════════════════════════
          case 'ProductShelf':
          case 'ProductsGrid':
          case 'ProductGrid':
          case 'ProductSection':
          case 'ShopProductShelf':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || section.config?.heading || 'Products'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.productLimit || section.config?.product_limit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : (section.config?.layout || 'horizontal-scroll')}
                cardStyle={section.config?.cardStyle || 'default'}
                showTimer={section.config?.showTimer || false}
                showPercent={section.config?.showPercent || false}
                viewAllHref={section.config?.viewAllHref || section.config?.ctaLink || section.config?.viewAllLink || section.config?.button_link || '/shop'}
                viewAllText={section.config?.viewAllText || section.config?.ctaText || section.config?.button_text || 'See All'}
                accentColor={section.config?.accentColor}
                headerBgColor={section.config?.headerBgColor}
                params={{
                  featured: section.config?.filter_by === 'Featured' || section.config?.filterType === 'Featured',
                  categoryId: section.config?.categoryId,
                  categorySlug: section.config?.categorySlug,
                  popularity: section.config?.popularity,
                }}
              />
            );

          case 'TopSelling':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Top Selling Items'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : (section.config?.layout || 'horizontal-scroll')}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                accentColor={section.config?.accentColor}
              />
            );

          case 'Trending':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Trending Now'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'trending-products'}
                limit={section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : (section.config?.layout || 'horizontal-scroll')}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                accentColor={section.config?.accentColor}
              />
            );

          case 'BestSellers':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Best Sellers'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : (section.config?.layout || 'horizontal-scroll')}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                accentColor={section.config?.accentColor}
              />
            );

          case 'NewestArrivals':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Newest Arrivals'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'new-arrivals'}
                limit={section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : (section.config?.layout || 'horizontal-scroll')}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                accentColor={section.config?.accentColor}
              />
            );

          case 'FeaturedProducts':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Featured Products'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'featured-products'}
                limit={section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : (section.config?.layout || 'horizontal-scroll')}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                accentColor={section.config?.accentColor}
              />
            );

          case 'RelatedProducts':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'You May Also Like'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.productLimit || section.config?.product_limit || 4}
                layout={section.config?.layout || 'horizontal-scroll'}
                viewAllHref={section.config?.ctaLink || '/shop'}
                viewAllText={section.config?.ctaText || 'View All'}
              />
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 3: CATEGORY (CategoryGrid, CategorySection)
          // ═══════════════════════════════════════════════════════════════════
          case 'CategoryGrid':
          case 'CategoryGridShelf':
          case 'CategoriesGrid':
          case 'Categories':
          case 'CategorySection':
            return (
              <CategoryGridShelf
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'homepage-categories'}
                limit={section.config?.limit || 12}
                columns={section.config?.columns || 'auto'}
                showProductCount={section.config?.showProductCount === 'true' || section.config?.showProductCount === true}
                showViewAll={section.config?.showViewAll === 'true' || section.config?.showViewAll === true}
                viewAllHref={section.config?.viewAllHref || '/shop'}
                className={section.config?.className}
              />
            );

          case 'ShopCategories':
            return <CategorySection key={section.id} />;

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 4: BRAND (BrandGrid, Brands)
          // ═══════════════════════════════════════════════════════════════════
          case 'BrandGrid':
          case 'Brands':
            return (
              <BrandsSection
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                displayMode={section.config?.displayMode || 'full'}
                autoScroll={section.config?.autoScroll !== false}
                dataSourceId={section.dataSourceId || 'generic-brand-section'}
              />
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 5: CONTENT (Hero, RichText, FAQ, ContactForm, FeaturesGrid)
          // ═══════════════════════════════════════════════════════════════════
          case 'PageHero':
          case 'ShopHero':
          case 'WholesaleHero':
          case 'GetNowHero':
            return (
              <ContentSection
                key={section.id}
                title={section.title || section.config?.tagline || section.config?.heading || 'Welcome'}
                subtitle={section.subtitle || section.config?.subtitle}
                layout="hero"
                backgroundImage={section.config?.backgroundImage || section.config?.image || section.config?.imageUrl}
                bgColor={section.config?.bgColor}
                ctaText={section.config?.ctaText}
                ctaLink={section.config?.ctaLink || section.config?.href}
              />
            );

          case 'PageContent':
            return (
              <ContentSection
                key={section.id}
                title={section.title || section.config?.heading || 'Content'}
                subtitle={section.subtitle}
                layout="rich-text"
                content={section.config?.content}
              />
            );

          case 'ContactForm':
            return (
              <ContentSection
                key={section.id}
                title={section.title || section.config?.heading || 'Contact Us'}
                subtitle={section.subtitle}
                layout="form"
                email={section.config?.email}
                phone={section.config?.phone}
                address={section.config?.address}
              />
            );

          case 'FAQAccordion':
            return (
              <ContentSection
                key={section.id}
                title={section.title || section.config?.heading || 'FAQ'}
                layout="accordion"
                items={section.config?.items || [{ question: section.title || 'Question', answer: section.config?.answer || '' }]}
              />
            );

          case 'WholesaleFeatures':
          case 'GetNowFeatures':
            return (
              <ContentSection
                key={section.id}
                title={section.title || 'Features'}
                subtitle={section.subtitle}
                layout="features-grid"
                items={[
                  { title: section.config?.feature_1_title, text: section.config?.feature_1_text },
                  { title: section.config?.feature_2_title, text: section.config?.feature_2_text },
                  { title: section.config?.feature_3_title, text: section.config?.feature_3_text },
                ].filter((f): f is { title: string; text: string } => f.title)}
              />
            );

          case 'ProductGallery':
            return (
              <ContentSection
                key={section.id}
                title={section.title || 'Gallery'}
                layout="gallery"
                items={section.config?.images?.map((img: string, i: number) => ({ image: img, alt: section.title || `Image ${i}` })) || []}
              />
            );

          case 'ShopFilters':
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-6">
                <h3 className="text-lg font-bold mb-2">{section.title || 'Filters'}</h3>
                {section.config?.filter_categories && (
                  <div className="flex flex-wrap gap-2">
                    {String(section.config.filter_categories).split(',').map((cat: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-muted rounded-full text-xs font-medium">{cat.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 6: UTILITY (Testimonials, RecentlyViewed, Newsletter, etc.)
          // ═══════════════════════════════════════════════════════════════════
          case 'Testimonials':
            return (
              <TestimonialsSection
                key={section.id}
                title={section.title || section.config?.heading}
                subtitle={section.subtitle}
                items={section.config?.items || [{
                  rating: section.config?.rating,
                  customer_name: section.config?.customer_name,
                  review: section.config?.review,
                  customer_image: section.config?.customer_image,
                }].filter((t): t is any => t.customer_name || t.review)}
              />
            );

          case 'Newsletter':
            return (
              <NewsletterSection
                key={section.id}
                title={section.title || section.config?.heading}
                subtitle={section.subtitle || section.config?.subheading}
                ctaText={section.config?.ctaText || section.config?.button_text}
                bgColor={section.config?.bgColor}
                backgroundImage={section.config?.backgroundImage || section.config?.popup_image}
              />
            );

          case 'RecentlyViewed':
            return <RecentlyViewedSection key={section.id} />;

          case 'TrustBadges':
            const badges = section.config?.items || [];
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.slice(0, 4).map((badge: any, idx: number) => (
                    <div key={idx} className="bg-card border rounded-xl p-4 text-center">
                      <p className="text-2xl mb-2">{badge.icon || '🛡️'}</p>
                      <p className="text-sm font-bold">{badge.title || 'Badge'}</p>
                      <p className="text-xs text-muted-foreground">{badge.subtitle || ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            );

          case 'MembersBanner':
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-6">
                <div className="bg-card border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {section.config?.imageUrl && <img src={section.config.imageUrl} alt="" className="w-16 h-16 object-cover rounded-full" />}
                    <div>
                      {section.config?.tag && <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{section.config.tag}</span>}
                      <h3 className="text-lg font-black">{section.title || section.config?.title || 'Members Get More'}</h3>
                      {section.subtitle && <p className="text-sm text-muted-foreground">{section.subtitle}</p>}
                    </div>
                  </div>
                  {(section.config?.ctaText || section.config?.ctaLink) && (
                    <a href={section.config?.ctaLink || '/register'} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                      {section.config?.ctaText || 'Join Now'}
                    </a>
                  )}
                </div>
              </div>
            );

          case 'ShopPromoBanner':
            return (
              <PromoBanner
                key={section.id}
                title={section.title || section.config?.title}
                subtitle={section.subtitle}
                cta={section.config?.ctaText}
                href={section.config?.ctaLink}
                image={section.config?.imageUrl}
                gradient={section.config?.bgColor}
              />
            );

          case 'UpgradeBanner':
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-6">
                <div className="bg-card border rounded-2xl p-6 text-center">
                  <h3 className="text-xl font-black mb-2">{section.title || 'Upgrade Your Tech'}</h3>
                  {(section.config?.images || []).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {section.config.images.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt="" className="h-32 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 7: DEAL (FlashSale, LimitedStock, Appliances, CategoryDeal, TopExpress)
          // ═══════════════════════════════════════════════════════════════════
          case 'FlashSale':
            return (
              <FlashSaleSection
                key={section.id}
                title={section.title || section.config?.title}
                timerLabel={section.config?.countdownLabel}
                ctaText={section.config?.ctaText}
                ctaLink={section.config?.ctaLink || section.config?.viewAllLink}
                endTime={section.config?.endTime || section.config?.timerEndDate}
                headerBgColor={section.config?.headerBgColor}
                productLimit={section.config?.productLimit || section.config?.limit}
              />
            );

          case 'LimitedStockDeal':
            return (
              <LimitedStockDealSection
                key={section.id}
                title={section.title || section.config?.title}
                discountText={section.config?.discountText}
                discountPercent={section.config?.discountPercent}
                ctaText={section.config?.ctaText}
                ctaLink={section.config?.ctaLink}
                limit={section.config?.limit || 8}
                scroll={section.config?.scroll === 'true'}
                dataSourceId={section.dataSourceId || 'sale-items'}
              />
            );

          case 'AppliancesDeal':
            return (
              <AppliancesDealSection
                key={section.id}
                title={section.title || section.config?.title}
                ctaText={section.config?.ctaText}
                ctaLink={section.config?.ctaLink}
                limit={section.config?.limit || 8}
                scroll={section.config?.scroll === 'true'}
                dataSourceId={section.dataSourceId || 'top-selling'}
              />
            );

          case 'TopExpress':
            return (
              <TopExpressSection
                key={section.id}
                title={section.title || section.config?.title}
                ctaText={section.config?.ctaText}
                ctaLink={section.config?.ctaLink}
                limit={section.config?.limit || 8}
                scroll={section.config?.scroll === 'true'}
                dataSourceId={section.dataSourceId || 'trending-products'}
              />
            );

          case 'CategoryDeal':
            return (
              <CategoryDealSection
                key={section.id}
                title={section.title || section.config?.title}
                subtitle={section.subtitle || section.config?.subtitle}
                categoryId={section.config?.categoryId}
                categorySlug={section.config?.categorySlug}
                headerBgColor={section.config?.headerBgColor}
                productLimit={section.config?.productLimit || section.config?.limit}
                ctaLink={section.config?.ctaLink}
              />
            );

          // ═══════════════════════════════════════════════════════════════════
          // UNKNOWN: render raw config for safe debugging
          // ═══════════════════════════════════════════════════════════════════
          default:
            return (
              <div key={section.id} className="max-w-3xl mx-auto px-4 py-6">
                <h3 className="text-lg font-bold">{section.title || section.type || 'Section'}</h3>
                <pre className="text-xs bg-muted p-4 rounded-xl overflow-auto">{JSON.stringify(section.config ?? {}, null, 2)}</pre>
              </div>
            );
        }
      })}
    </div>
  );
}
