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
import BrandsSection from './BrandsSection';
import CategorySection from './CategorySection';
import FlashSaleSection from './FlashSaleSection';
import LimitedStockDealSection from './LimitedStockDealSection';
import AppliancesDealSection from './AppliancesDealSection';
import CategoryDealSection from './CategoryDealSection';
import ProductSection from './ProductSection';
import RecentlyViewedSection from './RecentlyViewedSection';
import CategoryPromoBanners from './CategoryPromoBanners';
import PromoBanners from './PromoBanners';
import HeroBannerSection from './HeroBannerSection';
import TopExpressSection from './TopExpressSection';

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
          case 'CategoriesGrid':
          case 'Categories':
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

          case 'TopSelling':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Top Selling Items'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : 'grid'}
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
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : 'grid'}
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
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : 'grid'}
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
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : 'grid'}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                accentColor={section.config?.accentColor}
              />
            );

          case 'CategorySection':
            return (
              <CategoryGridShelf
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'homepage-categories'}
                limit={section.config?.limit || 12}
                columns={section.config?.layout === 'horizontal' ? 6 : 'auto'}
                showProductCount={section.config?.showProductCount === 'true'}
                showViewAll={section.config?.showViewAll === 'true'}
                viewAllHref={section.config?.viewAllHref || '/shop'}
                className={section.config?.className}
              />
            );

          case 'HeroSlider':
            return (
              <BannerSlot
                key={section.id}
                slotKey={section.slotKey || "homepage-hero-slider"}
                autoRotate={true}
                rotationInterval={4000}
              />
            );

          case 'HeroBanner':
            return (
              <HeroBannerSection
                key={section.id}
                imageUrl={section.config?.imageUrl || section.config?.image || section.config?.media}
                title={section.title || section.config?.title || section.config?.heading}
                subtitle={section.subtitle || section.config?.subtitle}
                buttonText={section.config?.button_text || section.config?.buttonText}
                buttonLink={section.config?.button_link || section.config?.buttonLink}
                duration={section.config?.duration}
              />
            );

          case 'Brands':
            return <BrandsSection key={section.id} />;

          case 'FeaturedProducts':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || 'Featured Products'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'featured-products'}
                limit={section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : 'grid'}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                accentColor={section.config?.accentColor}
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

          case 'PageHero':
            return (
              <div key={section.id} className="relative w-full h-64 md:h-80 flex items-center justify-center text-center px-4 overflow-hidden">
                {(section.config?.backgroundImage || section.config?.image) && (
                  <img src={section.config?.backgroundImage || section.config?.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 text-white">
                  <h1 className="text-3xl font-black mb-2">{section.title || section.config?.heading || 'Welcome'}</h1>
                  {section.subtitle && <p className="text-lg opacity-90">{section.subtitle}</p>}
                </div>
              </div>
            );

          case 'PageContent':
            return (
              <div key={section.id} className="max-w-3xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-black mb-4">{section.title || section.config?.heading || 'Content'}</h2>
                {section.config?.content && (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{section.config.content}</div>
                )}
                {section.config?.last_updated && (
                  <p className="text-xs text-muted-foreground mt-3">Last updated: {section.config.last_updated}</p>
                )}
              </div>
            );

          case 'ContactForm':
            return (
              <div key={section.id} className="max-w-3xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-black mb-1">{section.title || section.config?.heading || 'Contact Us'}</h2>
                {section.subtitle && <p className="text-muted-foreground mb-4">{section.subtitle}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {section.config?.email && (
                    <div className="bg-card border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-bold text-sm">{section.config.email}</p>
                    </div>
                  )}
                  {section.config?.phone && (
                    <div className="bg-card border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-bold text-sm">{section.config.phone}</p>
                    </div>
                  )}
                  {section.config?.address && (
                    <div className="bg-card border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-bold text-sm">{section.config.address}</p>
                    </div>
                  )}
                </div>
              </div>
            );

          case 'FAQAccordion':
            return (
              <div key={section.id} className="max-w-3xl mx-auto px-4 py-6">
                <div className="bg-card border rounded-xl p-4 mb-3">
                  <p className="font-bold text-sm mb-1">{section.title || section.config?.heading || 'Question'}</p>
                  <p className="text-xs text-muted-foreground">{section.config?.answer || ''}</p>
                </div>
              </div>
            );

          case 'ProductsGrid':
          case 'ProductGrid':
          case 'ProductSection':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || section.config?.heading || 'Products'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.product_limit || section.config?.productLimit || section.config?.limit || 8}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : 'grid'}
                viewAllHref={section.config?.viewAllHref || section.config?.button_link || section.config?.ctaLink || '/shop'}
                viewAllText={section.config?.ctaText || section.config?.button_text || 'See All'}
                accentColor={section.config?.accentColor}
                params={{
                  featured: section.config?.filter_by === 'Featured' || section.config?.filterType === 'Featured',
                  categoryId: section.config?.categoryId,
                  categorySlug: section.config?.categorySlug,
                }}
              />
            );

          case 'PromoBanner':
          case 'promo_banners':
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-6">
                <div
                  className="w-full rounded-2xl p-6 md:p-10 text-center text-white"
                  style={{
                    background: section.config?.bgColor || section.config?.gradient || 'linear-gradient(135deg, #1FA89A, #27B9AF)',
                    backgroundImage: section.config?.image || section.config?.media ? `url(${section.config.image || section.config.media})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {section.config?.tag && (
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">{section.config.tag}</span>
                  )}
                  <h3 className="text-xl md:text-2xl font-black mb-2">{section.title || section.config?.title || section.config?.heading}</h3>
                  {(section.subtitle || section.config?.subtitle) && <p className="text-sm md:text-base opacity-90 mb-4">{section.subtitle || section.config?.subtitle}</p>}
                  {(section.config?.ctaText || section.config?.cta || section.config?.button_text) && (
                    <a href={section.config?.ctaLink || section.config?.href || section.config?.button_link || '#'} className="inline-block px-6 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold">
                      {section.config?.ctaText || section.config?.cta || section.config?.button_text || 'Shop Now'}
                    </a>
                  )}
                </div>
              </div>
            );

          case 'PromoBanners':
          case 'Promotions':
            return <PromoBanners key={section.id} />;

          case 'CategoryPromoBanners':
            return <CategoryPromoBanners key={section.id} />;

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

          case 'ShopHero':
            return (
              <div key={section.id} className="w-full py-12 px-4 text-center" style={{ background: section.config?.bgColor || 'linear-gradient(135deg, #0D9488 0%, #0a7c72 100%)' }}>
                {section.config?.imageUrl && (
                  <img src={section.config.imageUrl} alt="" className="max-w-full h-auto mb-4 mx-auto rounded-lg" />
                )}
                <h2 className="text-3xl font-black text-white mb-2">{section.title || section.config?.tagline || 'Shop the Best Deals'}</h2>
                {(section.subtitle || section.config?.subtitle) && <p className="text-white/90 mb-4">{section.subtitle || section.config?.subtitle}</p>}
                {(section.config?.ctaText || section.config?.ctaLink) && (
                  <a href={section.config?.ctaLink || '/shop'} className="inline-block px-6 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold">
                    {section.config?.ctaText || 'Shop Now'}
                  </a>
                )}
              </div>
            );

          case 'ShopCategories':
            return <CategorySection key={section.id} />;

          case 'ShopProductShelf':
            return (
              <ProductShelf
                key={section.id}
                title={section.title || section.config?.title || 'Products'}
                subtitle={section.subtitle}
                dataSourceId={section.dataSourceId || 'top-selling'}
                limit={section.config?.limit || 10}
                layout={section.config?.scroll === 'true' ? 'horizontal-scroll' : 'grid'}
                viewAllHref={section.config?.ctaLink || section.config?.viewAllLink || section.config?.viewAllHref || '/shop'}
                viewAllText={section.config?.ctaText || 'See All'}
                params={{
                  categorySlug: section.config?.categorySlug,
                  popularity: section.config?.popularity,
                }}
              />
            );

          case 'ShopPromoBanner':
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-6">
                <div
                  className="w-full rounded-2xl p-6 md:p-8 text-center text-white"
                  style={{ background: section.config?.bgColor || 'linear-gradient(135deg, #0f4c35, #1a7a52)' }}
                >
                  {section.config?.imageUrl && <img src={section.config.imageUrl} alt="" className="max-w-full h-32 object-contain mb-4 mx-auto" />}
                  {section.config?.tag && <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">{section.config.tag}</span>}
                  <h3 className="text-xl font-black mb-2">{section.title || section.config?.title}</h3>
                  {section.subtitle && <p className="text-sm opacity-90 mb-4">{section.subtitle}</p>}
                  {(section.config?.ctaText || section.config?.ctaLink) && (
                    <a href={section.config?.ctaLink || '#'} className="inline-block px-6 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold">
                      {section.config?.ctaText || 'Shop Now'}
                    </a>
                  )}
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

          case 'WholesaleHero':
          case 'GetNowHero':
            return (
              <div key={section.id} className="w-full py-12 px-4 text-center" style={{ background: section.config?.bgColor || 'linear-gradient(135deg, #1FA89A, #27B9AF)' }}>
                <h2 className="text-3xl font-black text-white mb-2">{section.title || 'Welcome'}</h2>
                {section.subtitle && <p className="text-white/90 mb-4">{section.subtitle}</p>}
                {(section.config?.ctaText || section.config?.ctaLink) && (
                  <a href={section.config?.ctaLink || '#'} className="inline-block px-6 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold">
                    {section.config?.ctaText || 'Get Started'}
                  </a>
                )}
              </div>
            );

          case 'WholesaleFeatures':
          case 'GetNowFeatures':
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-8">
                <h3 className="text-2xl font-black text-center mb-6">{section.title || 'Features'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="bg-card border rounded-2xl p-5">
                      <p className="font-bold text-sm mb-1">{section.config?.[`feature_${num}_title`] || `Feature ${num}`}</p>
                      <p className="text-xs text-muted-foreground">{section.config?.[`feature_${num}_text`] || ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            );

          case 'Testimonials':
            return (
              <div key={section.id} className="max-w-3xl mx-auto px-4 py-8">
                <div className="bg-card border rounded-2xl p-6">
                  <p className="text-xs text-muted-foreground mb-2">{section.config?.rating ? `Rating: ${section.config.rating}/5` : ''}</p>
                  <p className="text-sm font-bold mb-1">{section.config?.customer_name || 'Customer'}</p>
                  <p className="text-xs text-muted-foreground italic">"{section.config?.review || ''}"</p>
                </div>
              </div>
            );

          case 'ProductGallery':
            return (
              <div key={section.id} className="max-w-5xl mx-auto px-4 py-8">
                <h3 className="text-lg font-bold mb-4">{section.title || 'Gallery'}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-muted rounded-xl" />
                  ))}
                </div>
              </div>
            );

          case 'RelatedProducts':
            return (
              <ProductSection
                key={section.id}
                title={section.title || 'You May Also Like'}
                subtitle={section.subtitle}
                viewAllHref="/shop"
                viewAllText="View All"
                params={{ take: section.config?.productLimit || section.config?.product_limit || 4 }}
                limit={section.config?.productLimit || section.config?.product_limit || 4}
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
                ctaText={section.config?.ctaText}
                ctaLink={section.config?.ctaLink}
              />
            );

          case 'RecentlyViewed':
            return <RecentlyViewedSection key={section.id} />;

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

          // ─────────────────────────────────────────────────────────────────
          // UNKNOWN SECTION TYPE
          // ─────────────────────────────────────────────────────────────────
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
