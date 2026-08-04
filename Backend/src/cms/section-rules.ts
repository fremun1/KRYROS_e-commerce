/**
 * Section Rules Registry
 * 
 * This file defines all available data sources for product sections.
 * Each rule describes how to fetch a specific type of product listing.
 * 
 * Rules are referenced by their `id` in the `cms_sections` table via the `dataSourceId` field.
 * The backend uses these rules to automatically construct product queries.
 * The admin panel displays these rules as options when creating/editing sections.
 */

export interface SectionRule {
  id: string;
  label: string;
  description: string;
  category: 'products' | 'brand' | 'media' | 'custom';
  params: Record<string, any>;
  icon?: string;
  templateType: 'ProductShelf' | 'BrandGrid' | 'BannerCarousel' | 'CategorySection' | 'RecentlyViewed' | 'Custom';
}

export const SECTION_RULES: Record<string, SectionRule> = {
  // ─────────────────────────────────────────────────────────────────
  // PRODUCT-BASED RULES (for ProductShelf template)
  // ─────────────────────────────────────────────────────────────────

  'generic-product-shelf': {
    id: 'generic-product-shelf',
    label: 'Product Section',
    description: 'A generic product section that can be configured for any purpose.',
    category: 'products',
    params: {},
    icon: '📦',
    templateType: 'ProductShelf'
  },

  'top-selling': {
    id: 'top-selling',
    label: 'Top Selling Products',
    description: 'Products ordered by total sales count (most ordered first).',
    category: 'products',
    params: { popularity: 'bestseller' },
    icon: '📊',
    templateType: 'ProductShelf'
  },

  'trending-products': {
    id: 'trending-products',
    label: 'Trending Products',
    description: 'Products gaining popularity (ordered by recent orders + wishlist count).',
    category: 'products',
    params: { popularity: 'trending' },
    icon: '🔥',
    templateType: 'ProductShelf'
  },

  'new-arrivals': {
    id: 'new-arrivals',
    label: 'New Arrivals',
    description: 'Latest products added to the store (ordered by creation date).',
    category: 'products',
    // Explicit sort fields make the behaviour robust even if the frontend sends no sorting params.
    // (The ProductsService also supports `popularity: 'new'`, this just makes it unambiguous.)
    params: { popularity: 'new', sortBy: 'createdAt', order: 'desc' },
    icon: '✨',
    templateType: 'ProductShelf'
  },

  'flash-sales': {
    id: 'flash-sales',
    label: 'Flash Sales',
    description: 'Products with active flash sale pricing.',
    category: 'products',
    params: { isFlashSale: true },
    icon: '⚡',
    templateType: 'ProductShelf'
  },

  'featured-products': {
    id: 'featured-products',
    label: 'Featured Products',
    description: 'Manually featured products (hand-picked by admin).',
    category: 'products',
    params: { isFeatured: true },
    icon: '⭐',
    templateType: 'ProductShelf'
  },

  'sale-items': {
    id: 'sale-items',
    label: 'Sale Items',
    description: 'Products with active sales or flash sale pricing.',
    category: 'products',
    params: { popularity: 'sale' },
    icon: '🏷️',
    templateType: 'ProductShelf'
  },

  'credit-eligible': {
    id: 'credit-eligible',
    label: 'Get Now Eligible',
    description: 'Products available for purchase on credit (Get Now).',
    category: 'products',
    params: { allowCredit: true },
    icon: '💳',
    templateType: 'ProductShelf'
  },

  'wholesale-products': {
    id: 'wholesale-products',
    label: 'Wholesale Products',
    description: 'Products available for wholesale/bulk purchase.',
    category: 'products',
    params: { isWholesaleOnly: true },
    icon: '📦',
    templateType: 'ProductShelf'
  },
  
  'dynamic-query': {
    id: 'dynamic-query',
    label: 'Custom Dynamic Section',
    description: 'A fully customizable section where you define the filters (Brand, Category, Price, etc.).',
    category: 'products',
    params: {},
    icon: '🛠️',
    templateType: 'ProductShelf'
  },

  // ─────────────────────────────────────────────────────────────────
  // BRAND RULES (for BrandGrid template)
  // ─────────────────────────────────────────────────────────────────

  'generic-brand-section': {
    id: 'generic-brand-section',
    label: 'Brand Section',
    description: 'Display brands with options for image+name or just name with auto-scroll.',
    category: 'brand',
    params: {},
    icon: '🛡️',
    templateType: 'BrandGrid'
  },

  // ─────────────────────────────────────────────────────────────────
  // MEDIA RULES (for BannerCarousel template)
  // ─────────────────────────────────────────────────────────────────

  'banner-carousel': {
    id: 'banner-carousel',
    label: 'Banner Carousel',
    description: 'Swipeable image banners with optional text overlays, arrows, and dot indicators.',
    category: 'media',
    params: { clientSide: true },
    icon: '🖼️',
    templateType: 'BannerCarousel'
  },

  // ─────────────────────────────────────────────────────────────────
  // CATEGORY RULES (for CategorySection template)
  // ─────────────────────────────────────────────────────────────────

  'category-section': {
    id: 'category-section',
    label: 'Category Section',
    description: 'Display store categories in a grid or horizontal scroll layout. Fetches from /api/categories.',
    category: 'custom',
    params: { clientSide: true },
    icon: '🗂️',
    templateType: 'CategorySection'
  },

  // ─────────────────────────────────────────────────────────────────
  // CUSTOM RULES
  // ─────────────────────────────────────────────────────────────────

  'recently-viewed': {
    id: 'recently-viewed',
    label: 'Recently Viewed',
    description: 'Products the user has recently viewed (client-side, localStorage).',
    category: 'custom',
    params: { clientSide: true },
    icon: '👁️',
    templateType: 'RecentlyViewed'
  }
};

export function getRule(ruleId: string): SectionRule | null {
  return SECTION_RULES[ruleId] || null;
}

export function getAllRules(): SectionRule[] {
  return Object.values(SECTION_RULES);
}

export function getRulesByCategory(category: SectionRule['category']): SectionRule[] {
  return Object.values(SECTION_RULES).filter(rule => rule.category === category);
}

export function isValidRuleId(ruleId: string): boolean {
  return ruleId in SECTION_RULES;
}
