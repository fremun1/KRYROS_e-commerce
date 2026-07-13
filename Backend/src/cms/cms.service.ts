import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateFooterSectionDto } from './dto/create-footer-section.dto';
import { UpdateFooterSectionDto } from './dto/update-footer-section.dto';
import { CreateFooterLinkDto } from './dto/create-footer-link.dto';
import { UpdateFooterLinkDto } from './dto/update-footer-link.dto';
import { UpdateFooterConfigDto } from './dto/update-footer-config.dto';
import { CreateHomePageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomePageSectionDto } from './dto/update-homepage-section.dto';

@Injectable()
export class CMSService {
  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ── Cache invalidation helper — call after any write to banners/sections ──
  async invalidateCmsCache(type?: string) {
    const keys = [
      'cms:banners',
      'cms:banners:wholesale',
      'cms:banners:get-now',
      'cms:sections',
      type ? `cms:sections:${type}` : null,
    ].filter(Boolean) as string[];
    await Promise.all(keys.map(k => this.cacheManager.del(k)));
  }

  private async invalidateBannerCache(tag?: string) {
    const keys = ['cms:banners'];
    if (tag) keys.push(`cms:banners:${tag}`);
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  // ==================== HOME PAGE SECTIONS ====================

  async getHomePageSections(type?: string) {
    const cacheKey = type ? `cms:sections:${type}:homepage` : 'cms:sections:homepage';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { isActive: true, pageSlug: 'homepage' };
    if (type) where.type = type;

    const sections = await this.prisma.cMSSection.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    await this.cacheManager.set(cacheKey, sections, 5 * 60 * 1000);
    return sections;
  }

  async listHomePageSections() {
    return this.prisma.cMSSection.findMany({
      where: { pageSlug: 'homepage' },
      orderBy: { order: 'asc' },
    });
  }

  async createHomePageSection(data: CreateHomePageSectionDto) {
    const result = await this.prisma.cMSSection.create({
      data: {
        ...data,
        pageSlug: 'homepage',
        config: data.config ? (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) : undefined,
      } as any,
    });
    await this.invalidateCmsCache(result.type);
    return result;
  }

  async updateHomePageSection(id: string, data: UpdateHomePageSectionDto) {
    const result = await this.prisma.cMSSection.update({
      where: { id },
      data: {
        ...data,
        config: data.config ? (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) : undefined,
      } as any,
    });
    await this.invalidateCmsCache(result.type);
    return result;
  }

  async deleteHomePageSection(id: string) {
    const result = await this.prisma.cMSSection.delete({ where: { id } });
    await this.invalidateCmsCache(result.type);
    return result;
  }

  async resetAndSeedHomePageSections() {
    await this.prisma.cMSSection.deleteMany({ where: { pageSlug: 'homepage' } as any });
    return this.seedHomePageSections();
  }

  async seedHomePageSections() {
    // Sections that match the current User-UI frontend exactly:
    // 1.  HeroSection          → type: HeroSlider          (reads from cms_banners via /api/cms/banners)
    // 2.  TrustBadges          → type: TrustBadges         (reads from site-config/trust-badges)
    // 3.  CategorySection      → type: CategoriesGrid      (reads from /api/categories)
    // 4.  FlashSaleSection     → type: FlashSale           (reads flash-sale products)
    // 5.  RecentlyViewed       → type: RecentlyViewed      (client-side, localStorage)
    // 6.  TopSelling           → type: TopSelling          (auto-picked by order count)
    // 7.  LimitedStockDeal     → type: LimitedStockDeal    (configurable discount % banner + products)
    // 8.  AppliancesDeal       → type: AppliancesDeal      (appliance products)
    // 9.  TopExpress           → type: TopExpress          (express/trending products)
    // 10. UpgradeBanner        → type: UpgradeBanner       (image-only carousel)
    // 11. PromoBanners         → type: PromoBanners        (reads from cms_banners filtered by tag)
    // 12. NewestArrivals       → type: NewestArrivals      (auto-picked by createdAt)
    // 13. BestSellers          → type: BestSellers         (auto-picked by order count)
    // 14. Trending             → type: Trending            (auto-picked by orderItems + wishlists)
    // 15. CategoryPromoBanners → type: CategoryPromoBanners
    // 16. RecommendedProducts  → type: RecommendedProducts
    // 17. Newsletter           → type: Newsletter          (popup subscription)
    const defaultSections = [
      {
        type: 'HeroSlider',
        order: 1,
        isActive: true,
        title: 'Hero Banner',
        subtitle: 'Main hero slider — banners managed in CMS → Banners',
        animation: 'fadeIn',
        config: { showBanners: true, source: 'cms_banners' }
      },
      {
        type: 'Brands',
        order: 2,
        isActive: true,
        title: 'Top Brands',
        subtitle: 'Featured brand logos — managed via Brands',
        animation: 'slideUp',
        config: {}
      },
      {
        type: 'TrustBadges',
        order: 3,
        isActive: true,
        title: 'Trust Badges',
        subtitle: 'Why shop with us — managed via CMS → Trust Badges',
        backgroundColor: '#ffffff',
        animation: 'slideUp',
        config: {
          items: [
            { icon: 'Truck', title: 'Fast Delivery', subtitle: 'Express Shipping' },
            { icon: 'ShieldCheck', title: 'Genuine Tech', subtitle: '100% Authentic' },
            { icon: 'Smartphone', title: 'Verified Seller', subtitle: 'Trusted Platform' },
            { icon: 'CreditCard', title: 'Pay on Credit', subtitle: 'Flexible Terms' }
          ]
        }
      },
      {
        type: 'CategoriesGrid',
        order: 4,
        isActive: true,
        title: 'Shop by Category',
        subtitle: 'Browse our collections — driven by product categories',
        animation: 'zoomIn',
        config: {}
      },
      {
        type: 'FlashSale',
        order: 5,
        isActive: true,
        title: 'Flash Sale',
        subtitle: 'Limited time offers — products marked with flash sale pricing',
        backgroundColor: '#f8fafc',
        animation: 'zoomIn',
        config: {
          title: 'Flash Sale',
          countdownLabel: 'Time Left',
          ctaText: 'See All',
          ctaLink: '/shop',
          limit: 8,
          endTime: new Date(Date.now() + 86400000).toISOString()
        }
      },
      {
        type: 'PromoBanners',
        order: 6,
        isActive: true,
        title: 'Get Now Promo Banner',
        animation: 'slideUp',
        config: {
          tag: 'GET NOW',
          title: 'Smart Payment Plan',
          subtitle: 'Buy now, pay in easy monthly instalments.',
          cta: 'Learn More',
          href: '/get-now',
          image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80',
        }
      },
      {
        type: 'PromoBanners',
        order: 7,
        isActive: true,
        title: 'Free Shipping Promo Banner',
        animation: 'slideUp',
        config: {
          tag: 'FREE SHIPPING',
          title: 'Free Shipping Nationwide',
          subtitle: 'On all orders over $500.',
          cta: 'Shop Now',
          href: '/shop',
          image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80',
        }
      },
      {
        type: 'PromoBanners',
        order: 8,
        isActive: true,
        title: 'Flash Sale Promo Banner',
        animation: 'slideUp',
        config: {
          tag: 'LIMITED TIME',
          title: 'Flash Sale',
          subtitle: "Today's Hot Deals",
          desc: "Grab the best prices before they're gone — limited stock only",
          href: '/shop',
          gradient: 'linear-gradient(135deg, #7c1d1d 0%, #b91c1c 50%, #ef4444 100%)',
          emoji: '⚡'
        }
      },
      {
        type: 'RecommendedProducts',
        order: 9,
        isActive: true,
        title: 'Recommended For You',
        subtitle: 'Personalised product recommendations',
        animation: 'slideUp',
        config: { limit: 8, scroll: true }
      },
      {
        type: 'TopSelling',
        order: 10,
        isActive: true,
        title: 'Top Selling Items',
        subtitle: 'Auto-picked based on sales performance — most ordered products',
        animation: 'slideUp',
        config: { limit: 8, popularity: 'bestseller', scroll: true }
      },
      {
        type: 'LimitedStockDeal',
        order: 11,
        isActive: true,
        title: 'Limited Stock Deal',
        subtitle: 'Grab them before they\'re gone — configurable discount banner',
        animation: 'slideUp',
        config: {
          title: 'Limited Stock Deal',
          discountText: 'Up to 70% Off',
          discountPercent: 70,
          ctaText: 'Shop Now',
          ctaLink: '/shop',
          limit: 8,
          scroll: true,
          popularity: 'bestseller'
        }
      },
      {
        type: 'AppliancesDeal',
        order: 12,
        isActive: true,
        title: 'Appliances Deal',
        subtitle: 'Home appliances at unbeatable prices',
        animation: 'slideUp',
        config: {
          title: 'Appliances Deal',
          ctaText: 'View All',
          ctaLink: '/shop',
          limit: 8,
          scroll: true
        }
      },
      {
        type: 'TopExpress',
        order: 13,
        isActive: true,
        title: 'Top Express',
        subtitle: 'Fast delivery, top picks',
        animation: 'slideUp',
        config: {
          title: 'Top Express',
          ctaText: 'View All',
          ctaLink: '/shop',
          limit: 8,
          scroll: true,
          popularity: 'trending'
        }
      },
      {
        type: 'UpgradeBanner',
        order: 14,
        isActive: true,
        title: 'Upgrade Banner',
        subtitle: 'Image-only carousel — upload multiple banner images via CMS',
        animation: 'fadeIn',
        config: { images: [], autoSlide: true, interval: 4000 }
      },
      {
        type: 'NewestArrivals',
        order: 15,
        isActive: true,
        title: 'Newest Arrivals',
        subtitle: 'The latest products added to our store',
        animation: 'slideUp',
        config: { limit: 8, popularity: 'new', scroll: true }
      },
      {
        type: 'BestSellers',
        order: 16,
        isActive: true,
        title: 'Best Sellers',
        subtitle: 'Our most popular products',
        animation: 'slideUp',
        config: { limit: 8, popularity: 'bestseller', scroll: true }
      },
      {
        type: 'Trending',
        order: 17,
        isActive: true,
        title: 'Trending Now',
        subtitle: 'Hot products right now',
        animation: 'slideUp',
        config: { limit: 8, popularity: 'trending', scroll: true }
      },
    ];

    const existingSections = await this.prisma.cMSSection.findMany({ where: { pageSlug: 'homepage' } });

    if (existingSections.length === 0) {
      for (const section of defaultSections) {
        await this.prisma.cMSSection.create({ data: {
          ...section,
          pageSlug: 'homepage',
          templateType: this.mapLegacyTypeToTemplate(section.type),
          dataSourceId: this.mapLegacyTypeToDataSource(section.type),
          name: section.title || `${section.type} Section`,
        } as any });
      }
      return { success: true, message: `Seeded ${defaultSections.length} homepage sections for the current frontend.` };
    }

    // Upsert: ONLY add missing sections — NEVER overwrite existing ones
    // This ensures user's custom order, config, and visibility are preserved
    let added = 0;
    let skipped = 0;
    for (const def of defaultSections) {
      const existing = existingSections.find(s => s.type === def.type && s.title === def.title);
      if (!existing) {
        await this.prisma.cMSSection.create({ data: {
          ...def,
          pageSlug: 'homepage',
          templateType: this.mapLegacyTypeToTemplate(def.type),
          dataSourceId: this.mapLegacyTypeToDataSource(def.type),
          name: def.title || `${def.type} Section`,
        } as any });
        added++;
      } else {
        // Section already exists — skip it to preserve user's custom settings
        skipped++;
      }
    }

    return {
      success: true,
      added,
      skipped,
      message: skipped > 0
        ? `Added ${added} missing sections, ${skipped} existing sections preserved (not overwritten)`
        : `Seeded ${added} homepage sections`
    };
  }

  private mapLegacyTypeToTemplate(type: string): string {
    const map: Record<string, string> = {
      HeroSlider: 'BannerSlot',
      HeroBanner: 'BannerSlot',
      Brands: 'BrandGrid',
      TrustBadges: 'TrustBadges',
      CategoriesGrid: 'CategoryGrid',
      Categories: 'CategoryGrid',
      CategorySection: 'CategoryGrid',
      FlashSale: 'ProductShelf',
      PromoBanners: 'BannerSlot',
      promo_banners: 'BannerSlot',
      CategoryPromoBanners: 'BannerSlot',
      ProductSection: 'ProductShelf',
      RecommendedProducts: 'ProductShelf',
      RecentlyViewed: 'Custom',
      UpgradeBanner: 'BannerSlot',
      TopSelling: 'ProductShelf',
      NewestArrivals: 'ProductShelf',
      BestSellers: 'ProductShelf',
      Trending: 'ProductShelf',
      LimitedStockDeal: 'ProductShelf',
      AppliancesDeal: 'ProductShelf',
      TopExpress: 'ProductShelf',
      Newsletter: 'Newsletter',
      ProductGrid: 'ProductShelf',
    };
    return map[type] || 'Custom';
  }

  private mapLegacyTypeToDataSource(type: string): string | null {
    const map: Record<string, string> = {
      TopSelling: 'top-selling',
      Trending: 'trending-products',
      NewestArrivals: 'new-arrivals',
      BestSellers: 'top-selling',
      FlashSale: 'flash-sales',
      CategoriesGrid: 'homepage-categories',
      Categories: 'homepage-categories',
      CategorySection: 'homepage-categories',
      HeroSlider: 'homepage-hero-slider',
      HeroBanner: 'homepage-hero-slider',
      Brands: 'generic-brand-section',
      LimitedStockDeal: 'sale-items',
      AppliancesDeal: 'top-selling',
      TopExpress: 'trending-products',
    };
    return map[type] || null;
  }

  async getBanners(tag?: string) {
    const cacheKey = tag ? `cms:banners:${tag}` : 'cms:banners';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { isActive: true };
    if (tag) where.tag = tag;

    let banners = await this.prisma.cMSBanner.findMany({
      where,
      orderBy: { position: 'asc' },
    });

    await this.cacheManager.set(cacheKey, banners, 5 * 60 * 1000);
    return banners;
  }

  async seedDefaultPageBanners(tag: string) {
    const pageSeeds: Record<string, any[]> = {
      'get-now': [
        {
          title: 'Shop Now, Pay Later',
          subtitle: 'Get your favourite products with 0% interest financing.',
          mediaType: 'image',
          image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&h=600&fit=crop&auto=format&q=85',
          link: '/shop',
          linkText: 'Shop Now',
          tag: 'get-now',
          isActive: true,
          position: 0,
        },
        {
          title: 'Instant Approval',
          subtitle: 'Apply in seconds and enjoy your purchase today.',
          mediaType: 'image',
          image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1600&h=600&fit=crop&auto=format&q=85',
          link: '/financing',
          linkText: 'Apply Now',
          tag: 'get-now',
          isActive: true,
          position: 1,
        },
      ],
      'wholesale': [
        {
          title: 'Wholesale Deals',
          subtitle: 'Bulk pricing on premium products for your business.',
          mediaType: 'image',
          image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1600&h=600&fit=crop&auto=format&q=85',
          link: '/wholesale',
          linkText: 'Browse Deals',
          tag: 'wholesale',
          isActive: true,
          position: 0,
        },
        {
          title: 'Business Pricing',
          subtitle: 'Exclusive rates for verified wholesale partners.',
          mediaType: 'image',
          image: 'https://images.unsplash.com/photo-1542744095-291d1f67b221?w=1600&h=600&fit=crop&auto=format&q=85',
          link: '/wholesale',
          linkText: 'Get Started',
          tag: 'wholesale',
          isActive: true,
          position: 1,
        },
      ],
    };

    const seeds = pageSeeds[tag] ?? [];
    for (const banner of seeds) {
      await this.prisma.cMSBanner.create({ data: banner });
    }
    return { success: true, message: `Seeded ${seeds.length} banners for tag: ${tag}` };
  }

  async seedDefaultBanners() {
    const defaultBanners = [
      {
        tag: 'New Arrivals 2025',
        title: 'Next-Level\nSmartphones.',
        subtitle: 'Own the latest iPhone, Samsung & more — with 0% financing from $58/mo.',
        linkText: 'Shop Phones',
        link: '/shop',
        secondaryCta: '0% Financing',
        secondaryCtaLink: '/financing',
        mediaType: 'youtube',
        videoUrl: 'B0TICvpuaww',
        badge: '50K+ Products',
        position: 0,
        isActive: true
      },
      {
        tag: 'Flash Deal — Ends Soon',
        title: 'Fashion That\nTurns Heads.',
        subtitle: 'Streetwear, sneakers, shades and more. New drops every week.',
        linkText: 'Explore Fashion',
        link: '/shop',
        secondaryCta: 'Flash Deals',
        secondaryCtaLink: '/flash-sales',
        mediaType: 'image',
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&h=900&fit=crop&auto=format&q=90',
        badge: 'Up to 70% Off',
        position: 1,
        isActive: true
      },
      {
        tag: 'Best Sellers',
        title: 'Sound Without\nBoundaries.',
        subtitle: 'Sony, Apple AirPods, Samsung Buds — immersive audio at flash prices.',
        linkText: 'Shop Audio',
        link: '/shop',
        secondaryCta: 'View Deals',
        secondaryCtaLink: '/flash-sales',
        mediaType: 'image',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&h=900&fit=crop&auto=format&q=90',
        badge: 'New Drops',
        position: 2,
        isActive: true
      },
      {
        tag: '0% Interest — Instant Approval',
        title: 'Own It Today.\nPay Tomorrow.',
        subtitle: 'Get instant credit up to $5,500. No hidden fees, no paperwork.',
        linkText: 'Apply Now',
        link: '/financing',
        secondaryCta: 'Shop Now',
        secondaryCtaLink: '/shop',
        mediaType: 'image',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&h=900&fit=crop&auto=format&q=90',
        badge: 'Instant Credit',
        position: 3,
        isActive: true
      }
    ];

    for (const banner of defaultBanners) {
      await this.prisma.cMSBanner.create({ data: banner });
    }
    return { success: true, message: 'Default banners seeded' };
  }

  async listBanners() {
    return this.prisma.cMSBanner.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async createBanner(data: CreateBannerDto) {
    const banner = await this.prisma.cMSBanner.create({
      data: {
        ...data,
        isActive: data.isActive ?? true,
        mediaType: data.mediaType ?? (data.videoUrl ? 'video' : 'image'),
      },
    });
    await this.invalidateBannerCache(banner.tag ?? undefined);
    return banner;
  }

  async updateBanner(id: string, data: UpdateBannerDto) {
    const existing = await this.prisma.cMSBanner.findUnique({ where: { id } });
    const banner = await this.prisma.cMSBanner.update({
      where: { id },
      data,
    });
    await this.invalidateBannerCache(existing?.tag ?? undefined);
    if (banner.tag !== existing?.tag) {
      await this.invalidateBannerCache(banner.tag ?? undefined);
    }
    return banner;
  }

  async deleteBanner(id: string) {
    const existing = await this.prisma.cMSBanner.findUnique({ where: { id } });
    const banner = await this.prisma.cMSBanner.delete({ where: { id } });
    await this.invalidateBannerCache(existing?.tag ?? undefined);
    return banner;
  }

  async getSections(pageSlug?: string) {
    const normalizedSlug = (pageSlug === 'home' || pageSlug === 'homepage' || pageSlug === '/' || pageSlug === '') ? 'homepage' : pageSlug;
    const where: any = { isActive: true };
    if (normalizedSlug) where.pageSlug = normalizedSlug;

    return this.prisma.cMSSection.findMany({ where, orderBy: { order: 'asc' } });
  }

  async getPage(slug: string) {
    return this.prisma.cMSPage.findUnique({ where: { slug } });
  }

  async listPages() {
    return this.prisma.cMSPage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createPage(data: { title: string; slug: string; content?: string; metaTitle?: string; metaDescription?: string; isActive?: boolean }) {
    return this.prisma.cMSPage.create({ data });
  }

  async updatePage(id: string, data: { title?: string; slug?: string; content?: string; metaTitle?: string; metaDescription?: string; isActive?: boolean }) {
    return this.prisma.cMSPage.update({ where: { id }, data });
  }

  async deletePage(id: string) {
    return this.prisma.cMSPage.delete({ where: { id } });
  }

  async seedAllPages() {
    const pages = [
      { title: 'Home',              slug: 'home',               isActive: true },
      { title: 'Shop',              slug: 'shop',               isActive: true },
      { title: 'About Us',          slug: 'about',              isActive: true },
      { title: 'Contact Us',        slug: 'contact',            isActive: true },
      { title: 'FAQ',               slug: 'faq',                isActive: true },
      { title: 'How It Works',      slug: 'how-it-works',       isActive: true },
      { title: 'Wholesale',         slug: 'wholesale',          isActive: true },
      { title: 'Get Now (BNPL)',     slug: 'get-now',            isActive: true },
      { title: 'Terms & Conditions',slug: 'terms',              isActive: true },
      { title: 'Privacy Policy',    slug: 'privacy',            isActive: true },
      { title: 'Refund Policy',     slug: 'refund',             isActive: true },
      { title: 'Shipping Policy',   slug: 'shipping',           isActive: true },
      { title: 'Returns Policy',    slug: 'returns',            isActive: true },
      { title: 'Security',          slug: 'security',           isActive: true },
      { title: 'Help Center',       slug: 'help',               isActive: true },
      { title: 'Cart',              slug: 'cart',               isActive: true },
      { title: 'Checkout',          slug: 'checkout',           isActive: true },
      { title: 'Track Order',       slug: 'track-order',        isActive: true },
      { title: 'My Account',        slug: 'account',            isActive: true },
      { title: 'Maintenance Mode',  slug: 'maintenance-mode',   isActive: false },
      { title: 'Flash Sale',         slug: 'flash-sale',          isActive: true },
    ];
    let added = 0, existing = 0;
    for (const p of pages) {
      const found = await this.prisma.cMSPage.findUnique({ where: { slug: p.slug } });
      if (!found) { await this.prisma.cMSPage.create({ data: p }); added++; }
      else { existing++; }
    }
    return { success: true, message: `Synced ${pages.length} pages — ${added} added, ${existing} already existed.` };
  }

  async resetAndSeedSectionsBySlug(slug: string) {
    // Sections per page matching the current frontend exactly
    const PAGE_SECTIONS: Record<string, { type: string; title: string; subtitle?: string; order: number; isActive: boolean; config?: any }[]> = {
      shop: [
        // Shop page is now a curated "storefront" composed of blocks.
        // Admin can add/remove/re-order blocks from CMS → Pages → Shop → Sections.
        { type: 'ShopHero',         title: 'Shop Hero',         subtitle: 'Top hero banner (managed via CMS → Shop Hero Banner)', order: 1, isActive: true, config: { source: 'site-config', key: 'shop', path: 'heroBanner' } },
        { type: 'ShopCategories',   title: 'Shop Categories',   subtitle: 'Horizontal category browsing row',                        order: 2, isActive: true, config: { mode: 'carousel' } },

        // Product shelves (horizontal)
        { type: 'ShopProductShelf', title: 'Top Selling',       subtitle: 'Best sellers shelf',                                    order: 3, isActive: true, config: { sectionSlug: 'top-selling', title: 'Top Selling Products', ctaText: 'See All', limit: 10, scroll: true, popularity: 'bestseller' } },
        { type: 'ShopProductShelf', title: 'Flash Sales',       subtitle: 'Flash sale deals shelf',                                 order: 4, isActive: true, config: { sectionSlug: 'flash-sales', title: 'Flash Sales', ctaText: 'See All', limit: 10, scroll: true, isFlashSale: true } },

        // Promo banner between shelves
        { type: 'ShopPromoBanner',  title: 'Mid Promo Banner',  subtitle: 'Break up shelves with a promo banner',                    order: 5, isActive: true, config: { tag: 'LIMITED TIME', title: 'Mega Deals', subtitle: 'Up to 50% Off Selected Items', ctaText: 'Shop Now', ctaLink: '/shop/section/flash-sales', bgColor: 'linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, #0d9488 100%)' } },

        // Category shelves (examples — update categorySlug to match your categories)
        { type: 'ShopProductShelf', title: 'Smartphones',       subtitle: 'Top smartphone picks',                                   order: 6, isActive: true, config: { sectionSlug: 'smartphones', title: 'Smartphones', ctaText: 'See All', limit: 10, scroll: true, categorySlug: 'smartphones' } },
        { type: 'ShopProductShelf', title: 'Accessories',       subtitle: 'Headphones, cases, chargers, and more',                   order: 7, isActive: true, config: { sectionSlug: 'accessories', title: 'Accessories', ctaText: 'See All', limit: 10, scroll: true, categorySlug: 'accessories' } },

        // Members banner near the bottom (managed in CMS → Shop Members Banner)
        { type: 'MembersBanner',    title: 'Members Banner',    subtitle: 'Join KRYROS for exclusive deals',                          order: 100, isActive: true, config: { source: 'site-config', key: 'shop', path: 'membersBanner' } },
      ],
      'product-detail': [
        { type: 'ProductGallery',   title: 'Product Gallery',   subtitle: 'Images & media',        order: 1, isActive: true, config: {} },
        { type: 'RelatedProducts',  title: 'Related Products',  subtitle: 'You may also like',     order: 2, isActive: true, config: { limit: 6 } },
        { type: 'Testimonials',     title: 'Testimonials',      subtitle: 'Customer reviews',      order: 3, isActive: true, config: {} },
      ],
      wholesale: [
        { type: 'WholesaleHero',    title: 'Wholesale Hero',    subtitle: 'Buy More, Save More',   order: 1, isActive: true, config: { source: 'site-config', key: 'wholesale' } },
        { type: 'WholesaleFeatures',title: 'Wholesale Features',subtitle: 'Benefits & steps',      order: 2, isActive: true, config: {} },
      ],
      faq: [
        { type: 'PageHero',         title: 'FAQ Hero',          subtitle: 'Frequently Asked Questions', order: 1, isActive: true, config: {} },
        { type: 'FAQAccordion',     title: 'FAQ Accordion',     subtitle: 'Questions & answers',        order: 2, isActive: true, config: {} },
      ],
      'contact': [
        { type: 'PageHero',         title: 'Contact Hero',      subtitle: 'Get in touch with us', order: 1, isActive: true, config: {} },
        { type: 'ContactForm',      title: 'Contact Form',      subtitle: 'Send us a message',    order: 2, isActive: true, config: {} },
      ],
      'get-now': [
        { type: 'GetNowHero',       title: 'Get Now Hero',      subtitle: 'Buy Now, Pay Later',   order: 1, isActive: true, config: {} },
        { type: 'GetNowFeatures',   title: 'Get Now Features',  subtitle: 'BNPL benefits',        order: 2, isActive: true, config: {} },
      ],
      'about': [
        { type: 'PageHero',         title: 'About Hero',        subtitle: 'Our story',            order: 1, isActive: true, config: {} },
        { type: 'PageContent',      title: 'About Content',     subtitle: 'Who we are',           order: 2, isActive: true, config: {} },
      ],
      'how-it-works': [
        { type: 'PageHero',         title: 'How It Works Hero', subtitle: 'Simple steps',         order: 1, isActive: true, config: {} },
        { type: 'PageContent',      title: 'How It Works',      subtitle: 'Step by step guide',   order: 2, isActive: true, config: {} },
      ],
      'terms':  [{ type: 'PageContent', title: 'Terms & Conditions', order: 1, isActive: true, config: {} }],
      'privacy':    [{ type: 'PageContent', title: 'Privacy Policy',     order: 1, isActive: true, config: {} }],
      'refund':     [{ type: 'PageContent', title: 'Refund Policy',      order: 1, isActive: true, config: {} }],
      'shipping':   [{ type: 'PageContent', title: 'Shipping Policy',    order: 1, isActive: true, config: {} }],
      'returns':    [{ type: 'PageContent', title: 'Returns Policy',     order: 1, isActive: true, config: {} }],
      'security':   [{ type: 'PageContent', title: 'Security',           order: 1, isActive: true, config: {} }],
      'track-order':       [{ type: 'PageContent', title: 'Track Order',        order: 1, isActive: true, config: {} }],
      'help':               [{ type: 'PageContent', title: 'Help Center',        order: 1, isActive: true, config: {} }],
      cart:                [{ type: 'PageContent', title: 'Cart',               order: 1, isActive: true, config: {} }],
      checkout:            [{ type: 'PageContent', title: 'Checkout',           order: 1, isActive: true, config: {} }],
      account:             [{ type: 'PageContent', title: 'My Account',         order: 1, isActive: true, config: {} }],
      'flash-sale': [
        { type: 'SaleBanner',    title: 'Sale Banner',    subtitle: 'Flash sale promotion', order: 1, isActive: true, config: {} },
        { type: 'ProductsGrid',  title: 'Products Grid',  subtitle: 'Sale items listing',   order: 2, isActive: true, config: { filter: 'sale', limit: 12 } },
      ],
    };

    // Normalize homepage slug variants
    const normalizedSlug = (slug === 'home' || slug === 'homepage' || slug === '/' || slug === '') ? 'homepage' : slug;
    
    // Check if we have sections defined for this page
    let sections = PAGE_SECTIONS[normalizedSlug];
    
    // If it's the homepage and no specific sections are defined in PAGE_SECTIONS,
    // use the full homepage seeder so all frontend sections exist.
    if (!sections && normalizedSlug === 'homepage') {
      await this.resetAndSeedHomePageSections();
      return { success: true, message: `Reset & seeded homepage sections via resetAndSeedHomePageSections` };
    }

    if (!sections) {
      return { success: false, message: `No section definition found for page slug: ${normalizedSlug}` };
    }

    // WARNING: This is intentionally destructive — it wipes ALL existing sections for this page
    // and replaces them with defaults. Only use when you want to start fresh.
    // For non-destructive updates, use the admin UI to edit individual sections instead.
    await this.prisma.cMSSection.deleteMany({ where: { pageSlug: normalizedSlug } as any });

    // Re-seed with new dynamic fields
    for (const s of sections) {
      // Determine templateType and dataSourceId for seeded sections
      let templateType = (s as any).templateType || 'ProductShelf';
      let dataSourceId = (s as any).dataSourceId || null;
      let slotKey = (s as any).slotKey || null;

      // Map legacy types to new system for seeded defaults
      if (s.type === 'HeroSlider') {
        templateType = 'BannerSlot';
        slotKey = 'homepage-hero-slider';
      } else if (s.type === 'CategoriesGrid') {
        templateType = 'CategoryGrid';
        dataSourceId = 'homepage-categories';
      } else if (['TopSelling', 'Trending', 'BestSellers', 'NewestArrivals', 'FlashSale'].includes(s.type)) {
        templateType = 'ProductShelf';
        dataSourceId = s.type === 'Trending' ? 'trending-products' : 
                       s.type === 'NewestArrivals' ? 'new-arrivals' : 
                       s.type === 'FlashSale' ? 'flash-sales' : 'top-selling';
      }

      await this.prisma.cMSSection.create({ 
        data: { 
          ...s, 
          pageSlug: normalizedSlug,
          templateType,
          dataSourceId,
          slotKey,
          name: s.title || `${s.type} Section`
        } as any 
      });
    }

    return { success: true, message: `Reset & seeded ${sections.length} sections for page: ${slug}` };
  }

  // Sections management
  async listSections(pageSlug?: string) {
    const where: any = {};
    if (pageSlug) where.pageSlug = pageSlug;
    return this.prisma.cMSSection.findMany({ where, orderBy: { order: 'asc' } });
  }

  async createSection(data: CreateSectionDto) {
    // Auto-map templateType and dataSourceId if type is provided but they are not
    let { templateType, dataSourceId, type } = data as any;
    if (type && !templateType) {
      templateType = this.mapLegacyTypeToTemplate(type);
    }
    if (type && !dataSourceId) {
      dataSourceId = this.mapLegacyTypeToDataSource(type);
    }

    const section = await this.prisma.cMSSection.create({
      data: {
        ...data,
        templateType,
        dataSourceId,
      } as any,
    });
    await this.invalidateCmsCache();
    return section;
  }

  async updateSection(id: string, data: UpdateSectionDto) {
    const section = await this.prisma.cMSSection.update({
      where: { id },
      data: {
        ...data,
      } as any,
    });
    await this.invalidateCmsCache();
    return section;
  }

  async deleteSection(id: string) {
    try {
      const existing = await this.prisma.cMSSection.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Section with id '${id}' not found`);
      }
      const section = await this.prisma.cMSSection.delete({ where: { id } });
      await this.invalidateCmsCache();
      return section;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(`Failed to delete section: ${err.message}`);
    }
  }

  async reorderSections(pageSlug: string, idsInOrder: string[]) {
    // Normalize pageSlug for consistency
    const normalizedSlug = (pageSlug === 'home' || pageSlug === '/' || pageSlug === '') ? 'homepage' : pageSlug;
    
    // Verify all sections exist and belong to this page
    const existingSections = await this.prisma.cMSSection.findMany({
      where: {
        id: { in: idsInOrder },
        pageSlug: normalizedSlug,
      } as any,
    });
    
    const foundIds = new Set(existingSections.map(s => s.id));
    const missingIds = idsInOrder.filter(id => !foundIds.has(id));
    
    if (missingIds.length > 0) {
      throw new BadRequestException(`Sections not found on page '${normalizedSlug}': ${missingIds.join(', ')}`);
    }
    
    const updates = idsInOrder.map((id, index) =>
      this.prisma.cMSSection.update({
        where: { id },
        data: { order: index },
      }),
    );
    await Promise.all(updates);
    await this.invalidateCmsCache();
    return { success: true, message: `${idsInOrder.length} sections reordered successfully` };
  }

  async seedSections() {
    // Ensure a Categories Grid section exists and enabled
    const section = await this.prisma.cMSSection.findFirst({
      where: {
        OR: [{ type: 'categories' }, { title: 'Shop by Category' }],
      },
    });
    if (!section) {
      await this.prisma.cMSSection.create({
        data: {
          type: 'categories',
          title: 'Shop by Category',
          subtitle: 'Browse our wide range of tech products',
          isActive: true,
          order: 3,
        } as any,
      });
    } else if (!section.isActive) {
      await this.prisma.cMSSection.update({
        where: { id: section.id },
        data: { isActive: true },
      });
    }

    // Ensure a Fast Filters section exists
    const fastFilters = await this.prisma.cMSSection.findFirst({
      where: { type: 'fast_filters' },
    });
    if (!fastFilters) {
      await this.prisma.cMSSection.create({
        data: {
          type: 'fast_filters',
          title: 'Refine Your Search',
          isActive: true,
          order: 11,
          config: {
            items: [
              { label: 'FEATURED', icon: '🟡', isActive: true },
              { label: 'BEST SELLERS', icon: '🔥', isActive: true },
              { label: 'TOP RATED', icon: '⭐', isActive: true },
            ],
          } as any,
        } as any,
      });
    }

    // Ensure a Wholesale Deals section exists and enabled (with sample items)
    const wholesale = await this.prisma.cMSSection.findFirst({
      where: { type: 'wholesale_deals' },
    });
    if (!wholesale) {
      await this.prisma.cMSSection.create({
        data: {
          type: 'wholesale_deals',
          title: 'Featured Wholesale Deals',
          isActive: true,
          order: 5,
          config: {
            items: [
              { title: 'iPhone 13 (Bulk)', subtitle: 'Min 10 units', price: 9999, minQty: 10 },
              { title: 'MacBook Air M2 (Bulk)', subtitle: 'Min 5 units', price: 54999, minQty: 5 },
              { title: 'Samsung S24 (Bulk)', subtitle: 'Min 8 units', price: 39999, minQty: 8 },
            ],
          } as any,
        } as any,
      });
    }

    return { success: true };
  }

  // ==================== FOOTER MANAGEMENT ====================

  async getFooter() {
    const sections = await this.prisma.footerSection.findMany({
      where: { isActive: true },
      include: {
        links: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    let config = await this.prisma.footerConfig.findFirst();

    if (sections.length === 0 || !config) {
      await this.seedFooter();
      const updatedSections = await this.prisma.footerSection.findMany({
        where: { isActive: true },
        include: {
          links: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      });
      config = await this.prisma.footerConfig.findFirst();
      return { sections: updatedSections, config };
    }

    return {
      sections,
      config,
    };
  }

  // Footer Sections
  async getFooterSections() {
    return this.prisma.footerSection.findMany({
      where: { isActive: true },
      include: {
        links: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async listFooterSections() {
    return this.prisma.footerSection.findMany({
      include: {
        links: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async createFooterSection(data: CreateFooterSectionDto) {
    return this.prisma.footerSection.create({
      data,
      include: {
        links: true,
      },
    });
  }

  async updateFooterSection(id: string, data: UpdateFooterSectionDto) {
    return this.prisma.footerSection.update({
      where: { id },
      data,
      include: {
        links: true,
      },
    });
  }

  async deleteFooterSection(id: string) {
    return this.prisma.footerSection.delete({
      where: { id },
    });
  }

  // Footer Links
  async createFooterLink(data: CreateFooterLinkDto) {
    return this.prisma.footerLink.create({ data });
  }

  async updateFooterLink(id: string, data: UpdateFooterLinkDto) {
    return this.prisma.footerLink.update({
      where: { id },
      data,
    });
  }

  async deleteFooterLink(id: string) {
    return this.prisma.footerLink.delete({
      where: { id },
    });
  }

  // Footer Config
  async getFooterConfig() {
    return this.prisma.footerConfig.findFirst();
  }

  async updateFooterConfig(data: UpdateFooterConfigDto) {
    const existing = await this.prisma.footerConfig.findFirst();

    if (existing) {
      return this.prisma.footerConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return this.prisma.footerConfig.create({ data: data as any });
    }
  }

  // Move a section up or down
  async moveSectionInOrder(
    sectionId: string,
    direction: 'up' | 'down',
    pageSlug: string
  ) {
    // Normalize pageSlug: 'home' → 'homepage', handle empty/undefined
    const normalizedSlug = (pageSlug === 'home' || pageSlug === '/' || pageSlug === '') ? 'homepage' : pageSlug;
    
    // Get all sections on this page, sorted by order
    const sections = await this.prisma.cMSSection.findMany({
      where: { pageSlug: normalizedSlug } as any,
      orderBy: { order: 'asc' },
    });

    const currentIndex = sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) throw new NotFoundException('Section not found on this page — make sure you are viewing the correct page');

    // Determine new index
    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < sections.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return { success: false, message: `Cannot move ${direction} from this position` };
    }

    // Swap orders using a temporary value to avoid conflicts
    const movedSection = sections[currentIndex];
    const swappedSection = sections[newIndex];
    const tempOrder = 99999; // Temporary order value

    // Step 1: Move current section to temp order
    await this.prisma.cMSSection.update({
      where: { id: movedSection.id },
      data: { order: tempOrder },
    });

    // Step 2: Move swapped section to current order
    await this.prisma.cMSSection.update({
      where: { id: swappedSection.id },
      data: { order: movedSection.order },
    });

    // Step 3: Move current section to swapped order
    await this.prisma.cMSSection.update({
      where: { id: movedSection.id },
      data: { order: swappedSection.order },
    });

    await this.invalidateCmsCache();
    return { success: true, message: `Section moved ${direction} successfully` };
  }

  async seedFooter() {
    // Check if footer already exists
    const existingSection = await this.prisma.footerSection.findFirst();
    if (existingSection) {
      return { success: true, message: 'Footer already seeded' };
    }

    // Create default footer sections with links
    const shopSection = await this.prisma.footerSection.create({
      data: {
        title: 'Shop',
        order: 1,
        isActive: true,
      },
    });

    const shopLinks = [
      { label: 'Smartphones', href: '/shop?category=smartphones' },
      { label: 'Laptops', href: '/shop?category=laptops' },
      { label: 'Accessories', href: '/shop?category=accessories' },
      { label: 'Wearables', href: '/shop?category=wearables' },
      { label: 'Software', href: '/software' },
    ];

    for (let i = 0; i < shopLinks.length; i++) {
      await this.prisma.footerLink.create({
        data: {
          sectionId: shopSection.id,
          label: shopLinks[i].label,
          href: shopLinks[i].href,
          order: i,
          isActive: true,
        },
      });
    }

    const servicesSection = await this.prisma.footerSection.create({
      data: {
        title: 'Services',
        order: 2,
        isActive: true,
      },
    });

    const serviceLinks = [
      { label: 'Phone Repairs', href: '/services?type=repairs' },
      { label: 'Laptop Repairs', href: '/services?type=repairs' },
      { label: 'Installation', href: '/services?type=installation' },
      { label: 'Tech Support', href: '/services?type=support' },
      { label: 'Consulting', href: '/services?type=consulting' },
    ];

    for (let i = 0; i < serviceLinks.length; i++) {
      await this.prisma.footerLink.create({
        data: {
          sectionId: servicesSection.id,
          label: serviceLinks[i].label,
          href: serviceLinks[i].href,
          order: i,
          isActive: true,
        },
      });
    }

    const supportSection = await this.prisma.footerSection.create({
      data: {
        title: 'Support',
        order: 3,
        isActive: true,
      },
    });

    const supportLinks = [
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Shipping Info', href: '/shipping' },
      { label: 'Returns', href: '/returns' },
      { label: 'Track Order', href: '/track-order' },
    ];

    for (let i = 0; i < supportLinks.length; i++) {
      await this.prisma.footerLink.create({
        data: {
          sectionId: supportSection.id,
          label: supportLinks[i].label,
          href: supportLinks[i].href,
          order: i,
          isActive: true,
        },
      });
    }

    const companySection = await this.prisma.footerSection.create({
      data: {
        title: 'Company',
        order: 4,
        isActive: true,
      },
    });

    const companyLinks = [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ];

    for (let i = 0; i < companyLinks.length; i++) {
      await this.prisma.footerLink.create({
        data: {
          sectionId: companySection.id,
          label: companyLinks[i].label,
          href: companyLinks[i].href,
          order: i,
          isActive: true,
        },
      });
    }

    // Create footer config
    await this.prisma.footerConfig.create({
      data: {
        description:
          'Your trusted source for phones, electronics, accessories, software, and technology services in Zambia and beyond.',
        contactPhone: '+260 966 423 719',
        contactEmail: 'kryrosmobile@gmail.com',
        contactAddress: 'Lusaka, Zambia',
        newsletterTitle: 'Subscribe to our Newsletter',
        newsletterSubtitle: 'Get the latest deals and updates directly to your inbox',
        copyrightText: '© {year} KRYROS MOBILE TECH LIMITED. All rights reserved.',
        socialLinks: [
          { platform: 'facebook', url: '#' },
          { platform: 'twitter', url: '#' },
          { platform: 'instagram', url: '#' },
          { platform: 'linkedin', url: '#' },
          { platform: 'youtube', url: '#' },
        ],
        paymentMethods: [{ name: 'Visa' }, { name: 'Mastercard' }, { name: 'M-Pesa' }],
        announcementBarEnabled: true,
        announcementBarText: '30% discount on all products special for November!',
        announcementBarBgColor: 'bg-kryros-dark',
        announcementBarTextColor: 'text-kryros-green',
        newsletterPopupEnabled: true,
        newsletterPopupTitle: 'Unlock Premium Deals',
        newsletterPopupSubtitle: 'Join our community and be the first to know about new arrivals, flash sales, and tech guides.',
        newsletterPopupDelay: 3000,
      } as any,
    });

    return { success: true, message: 'Footer seeded successfully' };
  }

  // ==================== SITE CONFIG ====================

  async getAllSiteConfigs() {
    return this.prisma.cMSSiteConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async getSiteConfigs() {
    const configs = await this.prisma.cMSSiteConfig.findMany();
    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }

  async getSiteConfig(key: string) {
    let config = await this.prisma.cMSSiteConfig.findUnique({ where: { key } });
    // Auto-seed defaults on first access — ensures keys are present before rendering
    if (!config) {
      await this.seedSiteConfigs();
      config = await this.prisma.cMSSiteConfig.findUnique({ where: { key } });
    }
    return config;
  }

  async upsertSiteConfig(key: string, value: any) {
    return this.prisma.cMSSiteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async seedSiteConfigs() {
    const defaults: Record<string, any> = {
      'trust-badges': {
        items: [
          { icon: 'Truck', title: 'Free Shipping', subtitle: 'On orders over $100' },
          { icon: 'ShieldCheck', title: 'Secure Payments', subtitle: '100% Secure' },
          { icon: 'RefreshCcw', title: 'Easy Returns', subtitle: '7-Day Returns' },
          { icon: 'Headphones', title: '24/7 Support', subtitle: 'We are here' },
        ],
      },
      'upgrade-banner': {
        heading: 'Upgrade Your Tech Game',
        subtitle: 'Unbeatable performance. Unmatched style.',
        ctaText: 'Shop Now',
        ctaLink: '/shop',
        discountText: '30%',
        discountSubtext: 'OFF',
        bgImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=85',
      },
      'members-banner': {
        title: 'KRYROS Members',
        subtitle: 'Join and get exclusive discounts on every order',
        discount: '5%',
        ctaText: 'Join Now',
        ctaLink: '/signup',
        bgColor: '#050F1A',
      },
      // Page-level site configs — keyed by page slug
      'shop': {
        membersBanner: {
          tag: 'KRYROS+',
          title: 'Extra 5% Off',
          subtitle: 'Exclusive discount for KRYROS members on all products',
          ctaText: 'Join Now',
          ctaLink: '/register',
        },
      },
      'get-now': {
        title1: 'Shop Now.',
        title2: 'Pay Later.',
        ctaText: 'Get Started',
        ctaLink: '/register',
        bgColor: '#EDF7F5',
        subtitle: 'Buy today, pay in easy monthly instalments. No hidden fees.',
      },
      'wholesale': {
        hero: {
          heading: 'Buy More, Save More!',
          subheading: 'Exclusive wholesale prices on thousands of products.',
          ctaText: 'Explore Products',
          ctaLink: '/shop',
        },
        steps: [
          { title: 'Browse Products', desc: 'Explore products available for wholesale' },
          { title: 'Add to Quote', desc: 'Add products to your quote list' },
          { title: 'Submit Quote', desc: 'Our team will review your request' },
          { title: 'Confirm & Order', desc: 'Confirm the quote and place your order' },
        ],
        features: [
          { title: 'Bulk Discounts', desc: 'Better prices on larger quantities' },
          { title: 'Priority Shipping', desc: 'Faster delivery for wholesale orders' },
          { title: 'Secure Payments', desc: 'Safe & encrypted transactions' },
          { title: 'Dedicated Support', desc: '24/7 priority customer support' },
        ],
        quoteCta: {
          title: 'Need a Custom Quote?',
          subtitle: 'Contact our wholesale team for personalised pricing',
          ctaText: 'Request Quote',
          ctaLink: '/contact',
        },
      },
      'product-settings': {
        deliveryThreshold: 100,
        freeDeliveryText: 'Free delivery on orders over $100',
        pickupAvailable: true,
        pickupText: 'Available at 3 pickup stations',
        paymentMethods: [
          { name: 'MTN Money', icon: 'mobile', isActive: true },
          { name: 'Airtel Money', icon: 'mobile', isActive: true },
          { name: 'Zamtel Kwacha', icon: 'mobile', isActive: true },
          { name: 'Visa Card', icon: 'card', isActive: true },
          { name: 'Mastercard', icon: 'card', isActive: true },
          { name: 'Bank Transfer', icon: 'bank', isActive: true },
        ],
        creditPlansVisible: true,
        defaultCreditDurations: [3, 6, 12],
      },
      'header': {
        logoText: 'KRYROS',
        announcementEnabled: true,
        announcementText: 'Free Delivery on all orders over $100',
        announcementCta: 'Track Order',
        announcementCtaLink: '/track',
        navLinks: [
          { label: 'Home', href: '/', isActive: true },
          { label: 'Shop', href: '/shop', isActive: true },
          { label: 'Get Now', href: '/get-now', isActive: true },
          { label: 'Wholesale', href: '/wholesale', isActive: true },
          { label: 'Pickup Stations', href: '/pickup-stations', isActive: true },
          { label: 'About Us', href: '/about', isActive: true },
          { label: 'Contact Us', href: '/contact', isActive: true },
        ],
      },
    };

    const results = [];
    for (const [key, value] of Object.entries(defaults)) {
      const existing = await this.prisma.cMSSiteConfig.findUnique({ where: { key } });
      if (!existing) {
        results.push(await this.prisma.cMSSiteConfig.create({ data: { key, value } }));
      }
    }
    return { success: true, seeded: results.length, message: `Seeded ${results.length} site configs` };
  }

  // ==================== BRAND BANNERS ====================

  async getBrandBanners(onlyActive = false) {
    return this.prisma.cMSBrandBanner.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { brandName: 'asc' },
    });
  }

  async getBrandBannerBySlug(brandSlug: string) {
    return this.prisma.cMSBrandBanner.findUnique({ where: { brandSlug } });
  }

  async upsertBrandBanner(data: any) {
    const { brandSlug, ...rest } = data;
    return this.prisma.cMSBrandBanner.upsert({
      where: { brandSlug },
      update: rest,
      create: { brandSlug, ...rest },
    });
  }

  async deleteBrandBanner(id: string) {
    return this.prisma.cMSBrandBanner.delete({ where: { id } });
  }

  async seedBrandBanners() {
    const defaults = [
      { brandSlug: 'apple', brandName: 'Apple', tagline: 'Think Different', description: 'Premium Apple products', bgColor: '#1d1d1f', bgGradient: 'linear-gradient(135deg,#1d1d1f,#3d3d3f)', ctaText: 'Shop Apple', ctaLink: '/shop?brand=Apple' },
      { brandSlug: 'samsung', brandName: 'Samsung', tagline: 'Do What You Cant', description: 'Galaxy Series & more', bgColor: '#1428A0', bgGradient: 'linear-gradient(135deg,#1428A0,#0070D2)', ctaText: 'Shop Samsung', ctaLink: '/shop?brand=Samsung' },
      { brandSlug: 'sony', brandName: 'Sony', tagline: 'Make Believe', description: 'Premium audio & electronics', bgColor: '#000000', bgGradient: 'linear-gradient(135deg,#000,#222)', ctaText: 'Shop Sony', ctaLink: '/shop?brand=Sony' },
    ];
    const results = [];
    for (const d of defaults) {
      const existing = await this.prisma.cMSBrandBanner.findUnique({ where: { brandSlug: d.brandSlug } });
      if (!existing) results.push(await this.prisma.cMSBrandBanner.create({ data: d }));
    }
    return { success: true, seeded: results.length };
  }

  // ==================== DATA MIGRATION ====================

  /**
   * Migrate legacy section records to the new 7-family model.
   * 
   * This normalizes all existing cms_sections by:
   * 1. Mapping legacy type values to canonical templateType values
   * 2. Setting proper dataSourceId based on the section type
   * 3. Cleaning up config fields that were never used
   * 4. Ensuring all sections have valid pageSlug values
   */
  async migrateLegacySections() {
    const logger = new Logger('CMSService.migrateLegacySections');
    logger.log('Starting legacy section migration...');

    const sections = await this.prisma.cMSSection.findMany({
      orderBy: { order: 'asc' },
    });

    const migrated: any[] = [];
    const skipped: any[] = [];

    // Type mapping table: legacy types -> canonical templateType
    const typeMapping: Record<string, string> = {
      // Product family
      'TopSelling': 'ProductShelf',
      'Trending': 'ProductShelf',
      'BestSellers': 'ProductShelf',
      'NewestArrivals': 'ProductShelf',
      'FeaturedProducts': 'ProductShelf',
      'ProductsGrid': 'ProductShelf',
      'ProductGrid': 'ProductShelf',
      'ProductSection': 'ProductShelf',
      'ShopProductShelf': 'ProductShelf',
      'RelatedProducts': 'ProductShelf',
      
      // Banner family
      'HeroSlider': 'BannerSlot',
      'HeroBanner': 'BannerSlot',
      'BannerSlot': 'BannerSlot',
      'PromoBanners': 'PromoBanner',
      'Promotions': 'PromoBanner',
      'promo_banners': 'PromoBanner',
      'ShopPromoBanner': 'PromoBanner',
      
      // Category family
      'CategoryGrid': 'CategoryGrid',
      'CategoryGridShelf': 'CategoryGrid',
      'CategoriesGrid': 'CategoryGrid',
      'Categories': 'CategoryGrid',
      'CategorySection': 'CategoryGrid',
      'ShopCategories': 'CategoryGrid',
      
      // Brand family
      'BrandGrid': 'BrandGrid',
      'Brands': 'BrandGrid',
      
      // Content family
      'PageHero': 'ContentSection',
      'ShopHero': 'ContentSection',
      'WholesaleHero': 'ContentSection',
      'GetNowHero': 'ContentSection',
      'PageContent': 'ContentSection',
      'ContactForm': 'ContentSection',
      'FAQAccordion': 'ContentSection',
      'WholesaleFeatures': 'ContentSection',
      'GetNowFeatures': 'ContentSection',
      'ProductGallery': 'ContentSection',
      
      // Utility family
      'Testimonials': 'Testimonials',
      'Newsletter': 'Newsletter',
      'RecentlyViewed': 'RecentlyViewed',
      'TrustBadges': 'TrustBadges',
      'MembersBanner': 'MembersBanner',
      'UpgradeBanner': 'UpgradeBanner',
      'ShopFilters': 'ShopFilters',
      
      // Deal family
      'FlashSale': 'FlashSale',
      'LimitedStockDeal': 'LimitedStockDeal',
      'AppliancesDeal': 'AppliancesDeal',
      'TopExpress': 'TopExpress',
      'CategoryDeal': 'CategoryDeal',
      
      // Category (direct)
      'category': 'CategoryGrid',
      'categories': 'CategoryGrid',
    };

    // dataSourceId mapping table: legacy type -> default dataSourceId
    const dataSourceMapping: Record<string, string> = {
      'TopSelling': 'top-selling',
      'Trending': 'trending-products',
      'BestSellers': 'top-selling',
      'NewestArrivals': 'new-arrivals',
      'FeaturedProducts': 'featured-products',
      'CategoryGrid': 'homepage-categories',
      'CategoriesGrid': 'homepage-categories',
      'Categories': 'homepage-categories',
      'BrandGrid': 'generic-brand-section',
      'Brands': 'generic-brand-section',
      'FlashSale': 'flash-sales',
      'LimitedStockDeal': 'sale-items',
      'AppliancesDeal': 'top-selling',
      'TopExpress': 'trending-products',
      'RecentlyViewed': 'recently-viewed',
    };

    // slotKey mapping for banner types
    const slotKeyMapping: Record<string, string> = {
      'HeroSlider': 'homepage-hero-slider',
      'HeroBanner': 'homepage-hero-slider',
    };

    // config normalization: add canonical fields based on templateType
    const configNormalization: Record<string, Partial<any>> = {
      'ProductShelf': { layout: 'horizontal-scroll', limit: 8 },
      'CategoryGrid': { layout: 'grid', limit: 12 },
      'BrandGrid': { displayMode: 'full', autoScroll: true },
      'BannerSlot': { bannerMode: 'hero' },
    };

    for (const section of sections) {
      const legacyType = section.type || '';
      const existingTemplateType = (section as any).templateType;
      
      // Skip if already normalized (has templateType that matches the mapping)
      if (existingTemplateType && typeMapping[legacyType] === existingTemplateType) {
        skipped.push({ id: section.id, reason: 'already normalized' });
        continue;
      }

      // Skip if templateType exists and is not in our mapping (could be custom)
      if (existingTemplateType && !typeMapping[legacyType] && typeMapping[existingTemplateType] !== existingTemplateType) {
        skipped.push({ id: section.id, reason: 'unknown custom type' });
        continue;
      }

      const canonicalTemplateType = typeMapping[legacyType] || existingTemplateType || 'ProductShelf';
      const currentConfig = (section.config as any) || {};
      const normalizedConfig: any = { ...currentConfig };

      // Apply config defaults if missing
      if (configNormalization[canonicalTemplateType]) {
        for (const [key, value] of Object.entries(configNormalization[canonicalTemplateType])) {
          if (!(key in normalizedConfig)) {
            normalizedConfig[key] = value;
          }
        }
      }

      // Clean up legacy config fields that were never used
      const fieldsToRemove = ['shopSlug', 'category_source', 'section_source'];
      for (const field of fieldsToRemove) {
        delete normalizedConfig[field];
      }

      // Set dataSourceId if not already set
      let dataSourceId = section.dataSourceId;
      if (!dataSourceId && dataSourceMapping[legacyType]) {
        dataSourceId = dataSourceMapping[legacyType];
      }

      // Set slotKey for banner types if not already set
      let slotKey = (section as any).slotKey;
      if (!slotKey && slotKeyMapping[legacyType]) {
        slotKey = slotKeyMapping[legacyType];
      }

      // Normalize pageSlug
      let pageSlug = section.pageSlug;
      if (pageSlug === 'home' || pageSlug === '/' || pageSlug === '') {
        pageSlug = 'homepage';
      }

      try {
        await this.prisma.cMSSection.update({
          where: { id: section.id },
          data: {
            templateType: canonicalTemplateType,
            dataSourceId: dataSourceId || null,
            slotKey: slotKey || null,
            pageSlug: pageSlug,
            config: normalizedConfig,
            name: section.name || section.title || canonicalTemplateType,
          } as any,
        });

        migrated.push({
          id: section.id,
          from: legacyType,
          to: canonicalTemplateType,
          pageSlug,
        });
      } catch (error) {
        logger.error(`Failed to migrate section ${section.id}: ${error}`);
        skipped.push({ id: section.id, reason: `error: ${error}` });
      }
    }

    // Invalidate CMS cache after migration
    await this.invalidateCmsCache();

    logger.log(`Migration complete: ${migrated.length} sections migrated, ${skipped.length} skipped`);

    return {
      success: true,
      migrated: migrated.length,
      skipped: skipped.length,
      details: { migrated, skipped },
    };
  }

}
