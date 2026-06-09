import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ── Cache invalidation helper — call after any write to banners/sections ──
  async invalidateCmsCache(type?: string) {
    const keys = [
      'cms:banners',
      'cms:sections',
      type ? `cms:sections:${type}` : null,
    ].filter(Boolean) as string[];
    await Promise.all(keys.map(k => this.cacheManager.del(k)));
  }

  // ==================== HOME PAGE SECTIONS ====================

  async getHomePageSections(type?: string) {
    const cacheKey = type ? `cms:sections:${type}` : 'cms:sections';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { isActive: true };
    if (type) where.type = type;

    let sections = await this.prisma.homePageSection.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    // Auto-seed if the database is empty (even with a type filter)
    // This ensures that frontend components like TrustBadges get data on first load
    const totalCount = await this.prisma.homePageSection.count();
    if (totalCount === 0) {
      await this.seedHomePageSections();
      sections = await this.prisma.homePageSection.findMany({
        where,
        orderBy: { order: 'asc' },
      });
    }

    await this.cacheManager.set(cacheKey, sections, 5 * 60 * 1000);
    return sections;
  }

  async listHomePageSections() {
    return this.prisma.homePageSection.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async createHomePageSection(data: CreateHomePageSectionDto) {
    const result = await this.prisma.homePageSection.create({
      data: {
        ...data,
        config: data.config ? (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) : undefined,
      } as any,
    });
    // Invalidate cache for this specific type
    await this.invalidateCmsCache(result.type);
    return result;
  }

  async updateHomePageSection(id: string, data: UpdateHomePageSectionDto) {
    const result = await this.prisma.homePageSection.update({
      where: { id },
      data: {
        ...data,
        config: data.config ? (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) : undefined,
      } as any,
    });
    // Invalidate cache for this specific type to ensure frontend gets fresh data
    await this.invalidateCmsCache(result.type);
    return result;
  }

  async deleteHomePageSection(id: string) {
    const result = await this.prisma.homePageSection.delete({ where: { id } });
    // Invalidate cache for this specific type
    await this.invalidateCmsCache(result.type);
    return result;
  }

  async resetAndSeedHomePageSections() {
    // Wipe ALL existing homepage sections (old frontend data)
    await this.prisma.homePageSection.deleteMany({});
    return this.seedHomePageSections();
  }

  async seedHomePageSections() {
    // Sections that match the current User-UI frontend exactly:
    // 1. HeroSection       → type: HeroSlider  (reads from cms_banners via /api/cms/banners)
    // 2. BrandsSection     → type: Brands       (reads from /api/brands)
    // 3. TrustBadges       → type: TrustBadges  (reads from site-config/trust-badges)
    // 4. CategorySection   → type: CategoriesGrid (reads from /api/categories)
    // 5. FlashSaleSection  → type: FlashSale    (reads flash-sale products)
    // 6. UpgradeBanner     → type: UpgradeBanner (reads from site-config/upgrade-banner)
    // 7. PromoBanners      → type: PromoBanners  (reads from cms_banners filtered by tag)
    // 8. FeaturedProductsSection → type: FeaturedProducts
    // 9. CategoryPromoBanners    → type: promo_banners (fetched via homepage-sections?type=promo_banners)
    // 10. RecentlyViewedSection  → type: RecentlyViewed (client-side, localStorage)
    // 11. ProductSection("Recommended For You") → type: RecommendedProducts
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
          limit: 8,
          endTime: new Date(Date.now() + 86400000).toISOString()
        }
      },
      {
        type: 'UpgradeBanner',
        order: 6,
        isActive: true,
        title: 'Upgrade Banner',
        subtitle: 'Promotional banner — managed via CMS → Upgrade Banner',
        animation: 'fadeIn',
        config: { source: 'site-config', key: 'upgrade-banner' }
      },
      {
        type: 'PromoBanners',
        order: 7,
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
        order: 8,
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
        type: 'FeaturedProducts',
        order: 8,
        isActive: true,
        title: 'Featured Products',
        subtitle: 'Tabbed section — products marked isFeatured=true',
        animation: 'slideUp',
        config: { tabs: ['All', 'New Arrivals', 'Best Selling', 'Top Rated'], limit: 8 }
      },
      {
        type: 'promo_banners',
        order: 9,
        isActive: true,
        title: 'Mega Deal',
        subtitle: 'On Selected Items',
        description: 'Get the biggest discounts on top electronics and accessories',
        link: '/shop',
        animation: 'slideUp',
        config: {
          tag: 'UP TO 50% OFF',
          title: 'Mega Deal',
          subtitle: 'On Selected Items',
          desc: 'Get the biggest discounts on top electronics and accessories',
          href: '/shop',
          gradient: 'linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, #0d9488 100%)',
          emoji: '🛒'
        }
      },
      {
        type: 'promo_banners',
        order: 10,
        isActive: true,
        title: 'Refer & Earn',
        subtitle: 'Invite Friends & Get Rewards',
        description: 'Share with friends and earn credit per referral',
        link: '/dashboard',
        animation: 'slideUp',
        config: {
          tag: 'EARN REWARDS',
          title: 'Refer & Earn',
          subtitle: 'Invite Friends & Get Rewards',
          desc: 'Share with friends and earn credit per referral',
          href: '/dashboard',
          gradient: 'linear-gradient(135deg, #1a3a5c 0%, #1e5f8c 50%, #0ea5c9 100%)',
          emoji: '🎁'
        }
      },
      {
        type: 'promo_banners',
        order: 11,
        isActive: true,
        title: 'Ship For Free',
        subtitle: 'On Orders Over $100',
        description: 'Fast delivery to your doorstep at no extra cost nationwide',
        link: '/shop',
        animation: 'slideUp',
        config: {
          tag: 'FREE DELIVERY',
          title: 'Ship For Free',
          subtitle: 'On Orders Over $100',
          desc: 'Fast delivery to your doorstep at no extra cost nationwide',
          href: '/shop',
          gradient: 'linear-gradient(135deg, #3b1f6b 0%, #5c2fa0 50%, #7c3aed 100%)',
          emoji: '🚚'
        }
      },
      {
        type: 'promo_banners',
        order: 12,
        isActive: true,
        title: 'Flash Sale',
        subtitle: "Today's Hot Deals",
        description: "Grab the best prices before they're gone — limited stock only",
        link: '/shop',
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
        type: 'RecentlyViewed',
        order: 13,
        isActive: true,
        title: 'Recently Viewed',
        subtitle: 'Products you recently browsed — client-side (localStorage)',
        animation: 'slideUp',
        config: { limit: 8, clientSide: true }
      },
      {
        type: 'RecommendedProducts',
        order: 14,
        isActive: true,
        title: 'Recommended For You',
        subtitle: 'Personalised product recommendations',
        animation: 'slideUp',
        config: { limit: 8, scroll: true }
      },
      {
        type: 'Newsletter',
        order: 15,
        isActive: true,
        title: 'Newsletter Popup',
        subtitle: 'Homepage newsletter subscription popup — configure content below',
        animation: 'fadeIn',
        config: {
          heading: 'Stay in the Loop with KRYROS',
          subheading: 'Subscribe to get exclusive deals, new arrivals, and special offers delivered straight to your inbox.',
          placeholder: 'Enter your email address',
          button_text: 'Subscribe',
        }
      },
    ];

    const existingSections = await this.prisma.homePageSection.findMany();

    if (existingSections.length === 0) {
      for (const section of defaultSections) {
        await this.prisma.homePageSection.create({ data: section as any });
      }
      return { success: true, message: `Seeded ${defaultSections.length} homepage sections for the current frontend.` };
    }

    // Upsert: add missing sections, update existing ones order/config
    let added = 0;
    let updated = 0;
    for (const def of defaultSections) {
      const existing = existingSections.find(s => s.type === def.type && s.title === def.title);
      if (!existing) {
        await this.prisma.homePageSection.create({ data: def as any });
        added++;
      } else {
        await this.prisma.homePageSection.update({
          where: { id: existing.id },
          data: { order: def.order, isActive: true, config: (def as any).config || existing.config }
        });
        updated++;
      }
    }

    return {
      success: true,
      message: `Sync complete — added ${added}, updated ${updated} sections.`
    };
  }


  async getBanners() {
    const banners = await this.prisma.cMSBanner.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });

    if (banners.length === 0) {
      await this.seedDefaultBanners();
      return this.prisma.cMSBanner.findMany({
        where: { isActive: true },
        orderBy: { position: 'asc' },
      });
    }

    return banners;
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
    return this.prisma.cMSBanner.create({ data });
  }

  async updateBanner(id: string, data: UpdateBannerDto) {
    return this.prisma.cMSBanner.update({
      where: { id },
      data,
    });
  }

  async deleteBanner(id: string) {
    return this.prisma.cMSBanner.delete({ where: { id } });
  }

  async getSections(pageSlug?: string) {
    const where: any = { isActive: true };
    if (pageSlug) where.pageSlug = pageSlug;

    let sections = await this.prisma.cMSSection.findMany({ where, orderBy: { order: 'asc' } });

    // Auto-seed if no sections exist for this specific page slug (same pattern as homepage)
    if (pageSlug && sections.length === 0) {
      await this.resetAndSeedSectionsBySlug(pageSlug);
      sections = await this.prisma.cMSSection.findMany({
        where: { pageSlug, isActive: true },
        orderBy: { order: 'asc' },
      });
    }

    return sections;
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
      { title: 'About Us',          slug: 'about-us',           isActive: true },
      { title: 'Contact Us',        slug: 'contact-us',         isActive: true },
      { title: 'FAQ',               slug: 'faq',                isActive: true },
      { title: 'How It Works',      slug: 'how-it-works',       isActive: true },
      { title: 'Wholesale',         slug: 'wholesale',          isActive: true },
      { title: 'Get Now (BNPL)',     slug: 'get-now',            isActive: true },
      { title: 'Terms & Conditions',slug: 'terms-conditions',   isActive: true },
      { title: 'Privacy Policy',    slug: 'privacy-policy',     isActive: true },
      { title: 'Refund Policy',     slug: 'refund-policy',      isActive: true },
      { title: 'Shipping Policy',   slug: 'shipping-policy',    isActive: true },
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
        { type: 'MembersBanner',    title: 'Members Banner',    subtitle: 'Join KRYROS for exclusive deals', order: 1, isActive: true, config: { source: 'site-config', key: 'members-banner' } },
        { type: 'ShopFilters',      title: 'Shop Filters',      subtitle: 'Filter & sort products',          order: 2, isActive: true, config: {} },
        { type: 'ProductGrid',      title: 'Product Grid',      subtitle: 'All products listing',            order: 3, isActive: true, config: { limit: 20 } },
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
      'contact-us': [
        { type: 'PageHero',         title: 'Contact Hero',      subtitle: 'Get in touch with us', order: 1, isActive: true, config: {} },
        { type: 'ContactForm',      title: 'Contact Form',      subtitle: 'Send us a message',    order: 2, isActive: true, config: {} },
      ],
      'get-now': [
        { type: 'GetNowHero',       title: 'Get Now Hero',      subtitle: 'Buy Now, Pay Later',   order: 1, isActive: true, config: {} },
        { type: 'GetNowFeatures',   title: 'Get Now Features',  subtitle: 'BNPL benefits',        order: 2, isActive: true, config: {} },
      ],
      'about-us': [
        { type: 'PageHero',         title: 'About Hero',        subtitle: 'Our story',            order: 1, isActive: true, config: {} },
        { type: 'PageContent',      title: 'About Content',     subtitle: 'Who we are',           order: 2, isActive: true, config: {} },
      ],
      'how-it-works': [
        { type: 'PageHero',         title: 'How It Works Hero', subtitle: 'Simple steps',         order: 1, isActive: true, config: {} },
        { type: 'PageContent',      title: 'How It Works',      subtitle: 'Step by step guide',   order: 2, isActive: true, config: {} },
      ],
      'terms-conditions':  [{ type: 'PageContent', title: 'Terms & Conditions', order: 1, isActive: true, config: {} }],
      'privacy-policy':    [{ type: 'PageContent', title: 'Privacy Policy',     order: 1, isActive: true, config: {} }],
      'refund-policy':     [{ type: 'PageContent', title: 'Refund Policy',      order: 1, isActive: true, config: {} }],
      'shipping-policy':   [{ type: 'PageContent', title: 'Shipping Policy',    order: 1, isActive: true, config: {} }],
      'track-order':       [{ type: 'PageContent', title: 'Track Order',        order: 1, isActive: true, config: {} }],
      cart:                [{ type: 'PageContent', title: 'Cart',               order: 1, isActive: true, config: {} }],
      checkout:            [{ type: 'PageContent', title: 'Checkout',           order: 1, isActive: true, config: {} }],
      account:             [{ type: 'PageContent', title: 'My Account',         order: 1, isActive: true, config: {} }],
      'flash-sale': [
        { type: 'SaleBanner',    title: 'Sale Banner',    subtitle: 'Flash sale promotion', order: 1, isActive: true, config: {} },
        { type: 'ProductsGrid',  title: 'Products Grid',  subtitle: 'Sale items listing',   order: 2, isActive: true, config: { filter: 'sale', limit: 12 } },
      ],
    };

    // Home page sections live in homepage_sections, not cms_sections
    if (slug === 'home') {
      return this.resetAndSeedHomePageSections();
    }

    const sections = PAGE_SECTIONS[slug];
    if (!sections) {
      return { success: false, message: `No section definition found for page slug: ${slug}` };
    }

    // Delete all existing cms_sections for this page slug
    await this.prisma.cMSSection.deleteMany({ where: { pageSlug: slug } as any });

    // Re-seed
    for (const s of sections) {
      await this.prisma.cMSSection.create({ data: { ...s, pageSlug: slug } as any });
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
    return this.prisma.cMSSection.create({ data: { ...data } as any });
  }

  async updateSection(id: string, data: UpdateSectionDto) {
    return this.prisma.cMSSection.update({ where: { id }, data: { ...data } as any });
  }

  async deleteSection(id: string) {
    return this.prisma.cMSSection.delete({ where: { id } });
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
}
