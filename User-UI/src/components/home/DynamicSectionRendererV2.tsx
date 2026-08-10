/**
 * DynamicSectionRendererV2.tsx
 *
 * Clean renderer organized into 4 generic families:
 * 1. PRODUCT     — ProductShelf (all variants)
 * 2. BRAND       — BrandsSection
 * 3. CONTENT     — RichText, FAQ, ContactForm, FeaturesGrid, Gallery
 * 4. UTILITY     — Testimonials, RecentlyViewed, Newsletter, ContentSection
 * 5. MEDIA        — BannerCarousel (swipeable image banners)
 *
 * Each family maps multiple legacy section types into a single canonical component.
 * The `default` branch renders unknown types as raw JSON for safe debugging.
 */

import { useMemo } from 'react';
import { normalizePageContext, getScopedSectionPath, getPageContextDisplayPath } from "@/lib/pageContext";
import ProductShelf from './ProductShelf';
import BrandsSection from './BrandsSection';
import RecentlyViewedSection from './RecentlyViewedSection';
import NewsletterSection from './NewsletterSection';
import ContentSection from './ContentSection';
import BannerCarousel from './BannerCarousel';
import CategorySection from './CategorySection';
import BrandSection from './BrandSection';

export interface CMSSection {
  id: string;
  templateType?: string;
  type?: string;
  dataSourceId?: string;
  slotKey?: string;
  title?: string;
  subtitle?: string;
  config?: Record<string, any>;
  order?: number;
  isActive: boolean;
}

interface DynamicSectionRendererV2Props {
  sections: CMSSection[];
  pageSlug?: string;
}

function toBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return fallback;
}

export default function DynamicSectionRendererV2({
  sections,
  pageSlug = 'homepage'
}: DynamicSectionRendererV2Props) {
  // Use the full pageSlug for link generation if it's a specific page, 
  // but normalize it for general context needs.
  const pageContext = useMemo(() => normalizePageContext(pageSlug), [pageSlug]);
  const linkContext = useMemo(() => {
    // If it's a shop-related page, keep the context as 'shop' for links
    if (pageSlug.startsWith('category-') || pageSlug.startsWith('brand-')) {
      return 'shop' as const;
    }
    return pageContext;
  }, [pageSlug, pageContext]);

  const sortedSections = useMemo(() => {
    return sections
      .filter(s => s.isActive)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [sections]);

  return (
    <div className="dynamic-section-renderer">
      {sortedSections.map((section) => {
        const templateType = section.templateType || section.type;

        // ═══════════════════════════════════════════════════════════════════
        // FAMILY 1: PRODUCT (all product shelf variants → ProductShelf)
        // ═══════════════════════════════════════════════════════════════════
        switch (templateType) {
          case 'ProductShelf':
          case 'ProductsGrid':
          case 'ProductGrid':
          case 'ProductSection':
          case 'ShopProductShelf':
          case 'TopSelling':
          case 'Trending':
          case 'BestSellers':
          case 'NewestArrivals':
          case 'FeaturedProducts':
          case 'FlashSale':
          case 'RelatedProducts':
            // Map legacy types to dataSourceId defaults
            const dataSourceMap: Record<string, string> = {
              'TopSelling': 'top-selling',
              'Trending': 'trending-products',
              'BestSellers': 'top-selling',
              'NewestArrivals': 'new-arrivals',
              'FeaturedProducts': 'featured-products',
              'FlashSale': 'flash-sales',
              'RelatedProducts': 'top-selling',
            };
            const isFlashSaleSection =
              templateType === 'FlashSale' || section.dataSourceId === 'flash-sales';
            return (
              <ProductShelf
                key={section.id}
                title={section.title || section.config?.heading || 'Products'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || dataSourceMap[templateType] || 'top-selling'}
                limit={section.config?.productLimit || section.config?.product_limit || section.config?.limit || (templateType === 'RelatedProducts' ? 4 : 8)}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : (section.config?.layout || 'horizontal-scroll')}
                cardStyle={section.config?.cardStyle || 'default'}
                showTimer={toBool(section.config?.showTimer)}
                showPercent={toBool(section.config?.showPercent)}
                viewAllHref={section.config?.viewAllHref || section.config?.ctaLink || section.config?.viewAllLink || section.config?.button_link || (() => {
                  const sId = section.id || (section as any)._id;
                  const sectionSlug = section.config?.sectionSlug || section.config?.slug || (isFlashSaleSection ? 'flash-sale' : (section.slotKey || sId));
                  
                  // If it's a flash sale, use the specific flash-sale route
                  if (isFlashSaleSection) {
                    return getScopedSectionPath(linkContext, 'flash-sale');
                  }
                  
                  return sectionSlug ? getScopedSectionPath(linkContext, sectionSlug) : getPageContextDisplayPath(linkContext);
                })()}
                viewAllText={section.config?.viewAllText || section.config?.ctaText || section.config?.button_text || 'See All'}
                accentColor={section.config?.accentColor}
                headerBgColor={section.config?.headerBgColor}
                textColor={section.config?.textColor}
                titleAlign={section.config?.titleAlign || 'left'}
                showSeeAll={section.config?.showSeeAll !== false}
                params={{
                  isFeatured: section.config?.filter_by === 'Featured' || section.config?.filterType === 'Featured' || section.config?.isFeatured,
                  allowCredit: section.config?.allowCredit,
                  isWholesaleOnly: section.config?.isWholesaleOnly,
                  categoryId: section.config?.categoryId,
                  categorySlug: section.config?.categorySlug,
                  brandSlug: section.config?.brandSlug,
                  popularity: section.config?.popularity,
                  sortBy: section.config?.sortBy,
                  // Backward/AI-script compatibility: some configs use `sortOrder: 'asc'|'desc'`
                  // while the storefront expects `order`.
                  order: section.config?.order ?? section.config?.sortOrder,
                }}
              />
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 2: BRAND (BrandGrid, Brands)
          // ═══════════════════════════════════════════════════════════════════
          case 'BrandGrid':
          case 'Brands':
            return (
              <BrandSection
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                limit={section.config?.limit || 8}
                pageSlug={pageSlug}
                titleAlign={section.config?.titleAlign || 'left'}
                showSeeAll={section.config?.showSeeAll !== false && Boolean(section.config?.viewAllHref || section.config?.ctaLink || section.config?.button_link)}
                viewAllHref={section.config?.viewAllHref || section.config?.ctaLink || section.config?.button_link || '/brands'}
                viewAllText={section.config?.viewAllText || section.config?.ctaText || section.config?.button_text || 'See All'}
                accentColor={section.config?.accentColor}
                textColor={section.config?.textColor}
                headerBgColor={section.config?.headerBgColor}
              />
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 4: CONTENT (RichText, FAQ, ContactForm, FeaturesGrid)
          // ═══════════════════════════════════════════════════════════════════
          case 'PageHero':
          case 'ShopHero':
          case 'WholesaleHero':
          case 'GetNowHero':
            return (
              <ContentSection
                key={section.id}
                title={section.title || section.config?.heading || 'Hero'}
                subtitle={section.subtitle || section.config?.subheading}
                layout="hero"
                content={section.config?.content || section.config?.description}
                backgroundImage={section.config?.backgroundImage || section.config?.bgImage}
                backgroundColor={section.config?.backgroundColor || section.config?.bgColor}
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
            const testimonials = section.config?.items || [{
              rating: section.config?.rating,
              customer_name: section.config?.customer_name,
              review: section.config?.review,
              customer_image: section.config?.customer_image,
            }].filter((t): t is any => t.customer_name || t.review);
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold mb-6">{section.title || section.config?.heading}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {testimonials.map((t: any, i: number) => (
                    <div key={i} className="bg-card border rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {t.customer_image && <img src={t.customer_image} alt="" className="w-10 h-10 rounded-full object-cover" />}
                        <div>
                          <p className="font-semibold">{t.customer_name}</p>
                          <div className="text-yellow-500 text-sm">{'★'.repeat(t.rating || 5)}</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{t.review}</p>
                    </div>
                  ))}
                </div>
              </div>
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
            return <RecentlyViewedSection key={section.id} pageSlug={pageSlug} />;

          case 'TrustBadges':
            const badges = section.config?.items || [];
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-8">
                <h2 className="text-xl font-bold mb-4">{section.title || 'Trust Badges'}</h2>
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


          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 7: CATEGORIES (CategorySection — Grid or Horizontal Scroll)
          // ═══════════════════════════════════════════════════════════════════
          case 'CategorySection':
            return (
              <CategorySection
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                layout={section.config?.layout || 'grid'}
                limit={section.config?.limit || 8}
                pageSlug={pageSlug}
                titleAlign={section.config?.titleAlign || 'left'}
                showSeeAll={section.config?.showSeeAll !== false && Boolean(section.config?.viewAllHref || section.config?.ctaLink || section.config?.button_link)}
                viewAllHref={section.config?.viewAllHref || section.config?.ctaLink || section.config?.button_link || '/categories'}
                viewAllText={section.config?.viewAllText || section.config?.ctaText || section.config?.button_text || 'See All'}
                accentColor={section.config?.accentColor}
                textColor={section.config?.textColor}
                headerBgColor={section.config?.headerBgColor}
              />
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 5: MEDIA (Banner Carousel)
          // ═══════════════════════════════════════════════════════════════════
          case 'BannerCarousel':
            return (
              <BannerCarousel
                key={section.id}
                slides={section.config?.slides || []}
                autoplay={section.config?.autoplay !== false}
                duration={section.config?.duration || 5}
                showDots={section.config?.showDots !== false}
                showArrows={section.config?.showArrows !== false}
                title={section.title}
                subtitle={section.subtitle}
                titleAlign={section.config?.titleAlign || 'left'}
                showSeeAll={section.config?.showSeeAll !== false && Boolean(section.config?.viewAllHref || section.config?.ctaLink || section.config?.button_link)}
                viewAllHref={section.config?.viewAllHref || section.config?.ctaLink || section.config?.button_link || '#'}
                viewAllText={section.config?.viewAllText || section.config?.ctaText || section.config?.button_text || 'See All'}
                accentColor={section.config?.accentColor}
                textColor={section.config?.textColor}
                headerBgColor={section.config?.headerBgColor}
              />
            );

          // ═══════════════════════════════════════════════════════════════════
          // FAMILY 6: UTILITY (Testimonials, RecentlyViewed, Newsletter, ContentSection)
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
