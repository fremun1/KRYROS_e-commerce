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

  // ── Cache invalidation helper — call after any write to sections ──
  async invalidateCmsCache(type?: string) {
    const keys = [
      'cms:sections',
      type ? `cms:sections:${type}` : null,
    ].filter(Boolean) as string[];
    await Promise.all(keys.map(k => this.cacheManager.del(k)));
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
    // 1.  TrustBadges          → type: TrustBadges         (reads from site-config/trust-badges)
    // 2.  FlashSaleSection     → type: FlashSale           (reads flash-sale products)
    // 3.  RecentlyViewed       → type: RecentlyViewed      (client-side, localStorage)
    // 4.  TopSelling           → type: TopSelling          (auto-picked by order count)
    // 5.  LimitedStockDeal     → type: LimitedStockDeal    (configurable discount % deal)
    // 6.  AppliancesDeal       → type: AppliancesDeal      (appliance products)
    // 7.  TopExpress           → type: TopExpress          (express/trending products)
    // 8.  NewestArrivals       → type: NewestArrivals      (auto-picked by createdAt)
    // 9.  BestSellers          → type: BestSellers         (auto-picked by order count)
    // 10. Trending             → type: Trending            (auto-picked by orderItems + wishlists)
    // 11. RecommendedProducts  → type: RecommendedProducts
    // 12. Newsletter           → type: Newsletter          (popup subscription)
    const defaultSections = [
      {
        type: 'RecentlyViewed',
        order: 1,
        isActive: true,
        title: 'Recently Viewed',
        subtitle: 'Products you\'ve recently viewed — client-side from localStorage',
        animation: 'slideUp',
        config: {}
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
        type: 'FlashSale',
        order: 4,
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
        type: 'RecommendedProducts',
        order: 5,
        isActive: true,
        title: 'Recommended For You',
        subtitle: 'Personalised product recommendations',
        animation: 'slideUp',
        config: { limit: 8, scroll: true }
      },
      {
        type: 'TopSelling',
        order: 6,
        isActive: true,
        title: 'Top Selling Items',
        subtitle: 'Auto-picked based on sales performance — most ordered products',
        animation: 'slideUp',
        config: { limit: 8, popularity: 'bestseller', scroll: true }
      },
      {
        type: 'LimitedStockDeal',
        order: 7,
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
        order: 8,
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
        order: 9,
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
        type: 'NewestArrivals',
        order: 10,
        isActive: true,
        title: 'Newest Arrivals',
        subtitle: 'The latest products added to our store',
        animation: 'slideUp',
        config: { limit: 8, popularity: 'new', scroll: true }
      },
      {
        type: 'BestSellers',
        order: 11,
        isActive: true,
        title: 'Best Sellers',
        subtitle: 'Our most popular products',
        animation: 'slideUp',
        config: { limit: 8, popularity: 'bestseller', scroll: true }
      },
      {
        type: 'Trending',
        order: 12,
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
      Brands: 'BrandGrid',
      TrustBadges: 'TrustBadges',
      FlashSale: 'ProductShelf',
      ProductSection: 'ProductShelf',
      RecommendedProducts: 'ProductShelf',
      RecentlyViewed: 'RecentlyViewed',
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
      RecentlyViewed: 'recently-viewed',
      TopSelling: 'top-selling',
      Trending: 'trending-products',
      NewestArrivals: 'new-arrivals',
      BestSellers: 'top-selling',
      FlashSale: 'flash-sales',
      Brands: 'generic-brand-section',
      LimitedStockDeal: 'sale-items',
      AppliancesDeal: 'top-selling',
      TopExpress: 'trending-products',
    };
    return map[type] || null;
  }

  async getSections(pageSlug?: string) {
    const normalizedSlug = (pageSlug === 'home' || pageSlug === 'homepage' || pageSlug === '/' || pageSlug === '') ? 'homepage' : pageSlug;
    const where: any = { isActive: true };
    if (normalizedSlug) where.pageSlug = normalizedSlug;

    return this.prisma.cMSSection.findMany({ where, orderBy: { order: 'asc' } });
  }

  async getSectionByIdOrSlug(identifier: string, pageSlug?: string) {
    const normalizedPageSlug =
      pageSlug === 'home' || pageSlug === 'homepage' || pageSlug === '/' || pageSlug === ''
        ? 'homepage'
        : pageSlug;
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const sectionLookupClauses: any[] = [
      { slotKey: identifier },
      { dedicatedPageSlug: identifier },
      { name: identifier },
      { dataSourceId: identifier },
      {
        config: {
          path: ['sectionSlug'],
          equals: identifier
        }
      },
      {
        config: {
          path: ['slug'],
          equals: identifier
        }
      }
    ];

    if (normalizedIdentifier === 'flash-sale' || normalizedIdentifier === 'flash-sales') {
      sectionLookupClauses.push(
        { type: 'FlashSale' },
        { dataSourceId: 'flash-sales' },
      );
    }

    // 1. Try finding by ID
    let section = await this.prisma.cMSSection.findUnique({
      where: { id: identifier }
    });

    // 2. If not found, try finding by config.sectionSlug or config.slug or slotKey
    if (!section) {
      // First try with pageSlug to avoid cross-page collisions
      if (normalizedPageSlug) {
        section = await this.prisma.cMSSection.findFirst({
          where: {
            pageSlug: normalizedPageSlug,
            OR: sectionLookupClauses,
            isActive: true
          }
        });
      }

      // Fallback to page-agnostic search if not found or no pageSlug provided
      if (!section) {
        section = await this.prisma.cMSSection.findFirst({
          where: {
            OR: [
              ...sectionLookupClauses,
              {
                config: {
                  path: ['pageSlug'],
                  equals: identifier
                }
              }
            ],
            isActive: true
          }
        });
      }
    }

    // 3. Special case for system-defined sections if still not found
    if (!section) {
      if (normalizedIdentifier === 'flash-sale' || normalizedIdentifier === 'flash-sales') {
        section = await this.prisma.cMSSection.findFirst({
          where: {
            ...(normalizedPageSlug ? { pageSlug: normalizedPageSlug } : {}),
            OR: [
              { type: 'FlashSale' },
              { dataSourceId: 'flash-sales' }
            ],
            isActive: true
          }
        });
      } else if (normalizedIdentifier === 'top-selling') {
        section = await this.prisma.cMSSection.findFirst({
          where: {
            ...(normalizedPageSlug ? { pageSlug: normalizedPageSlug } : {}),
            OR: [
              { type: 'TopSelling' },
              { dataSourceId: 'top-selling' }
            ],
            isActive: true
          }
        });
      }
    }

    return section;
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
        // Product shelves (horizontal)
        { type: 'ShopProductShelf', title: 'Top Selling',       subtitle: 'Best sellers shelf',                                    order: 3, isActive: true, config: { sectionSlug: 'top-selling', title: 'Top Selling Products', ctaText: 'See All', limit: 10, scroll: true, popularity: 'bestseller' } },
        { type: 'ShopProductShelf', title: 'Flash Sales',       subtitle: 'Flash sale deals shelf',                                 order: 4, isActive: true, config: { sectionSlug: 'flash-sales', title: 'Flash Sales', ctaText: 'See All', limit: 10, scroll: true, isFlashSale: true } },

        // Category shelves (examples — update categorySlug to match your categories)
        { type: 'ShopProductShelf', title: 'Smartphones',       subtitle: 'Top smartphone picks',                                   order: 6, isActive: true, config: { sectionSlug: 'smartphones', title: 'Smartphones', ctaText: 'See All', limit: 10, scroll: true, categorySlug: 'smartphones' } },
        { type: 'ShopProductShelf', title: 'Accessories',       subtitle: 'Headphones, cases, chargers, and more',                   order: 7, isActive: true, config: { sectionSlug: 'accessories', title: 'Accessories', ctaText: 'See All', limit: 10, scroll: true, categorySlug: 'accessories' } },

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
      if (['TopSelling', 'Trending', 'BestSellers', 'NewestArrivals', 'FlashSale'].includes(s.type)) {
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
    let { templateType, type } = data as any;
    if (type && !templateType) {
      templateType = this.mapLegacyTypeToTemplate(type);
    }

    const section = await this.prisma.cMSSection.update({
      where: { id },
      data: {
        ...data,
        ...(templateType ? { templateType } : {}),
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
      // Page-level site configs — keyed by page slug
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
      'ShopFilters': 'ShopFilters',
      
      // Deal family
      'FlashSale': 'FlashSale',
      'LimitedStockDeal': 'LimitedStockDeal',
      'AppliancesDeal': 'AppliancesDeal',
      'TopExpress': 'TopExpress',
      'CategoryDeal': 'CategoryDeal',

    };

    // dataSourceId mapping table: legacy type -> default dataSourceId
    const dataSourceMapping: Record<string, string> = {
      'TopSelling': 'top-selling',
      'Trending': 'trending-products',
      'BestSellers': 'top-selling',
      'NewestArrivals': 'new-arrivals',
      'FeaturedProducts': 'featured-products',
      'BrandGrid': 'generic-brand-section',
      'Brands': 'generic-brand-section',
      'FlashSale': 'flash-sales',
      'LimitedStockDeal': 'sale-items',
      'AppliancesDeal': 'top-selling',
      'TopExpress': 'trending-products',
      'RecentlyViewed': 'recently-viewed',
    };


    // config normalization: add canonical fields based on templateType
    const configNormalization: Record<string, Partial<any>> = {
      'ProductShelf': { layout: 'horizontal-scroll', limit: 8 },
      'BrandGrid': { displayMode: 'full', autoScroll: true },
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
            slotKey: null,
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
