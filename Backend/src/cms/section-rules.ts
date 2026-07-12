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
  category: 'products' | 'banner' | 'category' | 'brand' | 'custom';
  params: Record<string, any>;
  icon?: string;
  templateType: 'ProductShelf' | 'BannerSlot' | 'CategoryGrid' | 'BrandGrid' | 'Custom';
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
    params: { popularity: 'new' },
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

  // ─────────────────────────────────────────────────────────────────
  // CATEGORY RULES (for CategoryGrid template)
  // ─────────────────────────────────────────────────────────────────

  'generic-category-section': {
    id: 'generic-category-section',
    label: 'Category Section',
    description: 'A generic category section to display categories in grid or horizontal layout.',
    category: 'category',
    params: {},
    icon: '🏷️',
    templateType: 'CategoryGrid'
  },

  'homepage-categories': {
    id: 'homepage-categories',
    label: 'Homepage Categories Grid',
    description: 'Display product categories in a grid on the homepage.',
    category: 'category',
    params: { showOnHome: true },
    icon: '🏷️',
    templateType: 'CategoryGrid'
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
  // BANNER SLOTS (for BannerSlot template)
  // ─────────────────────────────────────────────────────────────────

  'generic-banner-section': {
    id: 'generic-banner-section',
    label: 'Banner Section',
    description: 'A generic banner section (Hero or Promo) that can be placed anywhere.',
    category: 'banner',
    params: { slotKey: 'generic' },
    icon: '🖼️',
    templateType: 'BannerSlot'
  },

  'homepage-hero-slider': {
    id: 'homepage-hero-slider',
    label: 'Homepage Hero Slider',
    description: 'Main hero banner slider at the top of homepage.',
    category: 'banner',
    params: { slotKey: 'homepage-hero-slider' },
    icon: '🎬',
    templateType: 'BannerSlot'
  },

  'homepage-mid-page': {
    id: 'homepage-mid-page',
    label: 'Mid-Page Banner',
    description: 'Banner positioned in the middle of the homepage.',
    category: 'banner',
    params: { slotKey: 'homepage-mid-page' },
    icon: '📍',
    templateType: 'BannerSlot'
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
    templateType: 'Custom'
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

export function getAllBannerSlots(): string[] {
  const slots = new Set<string>();
  for (const rule of Object.values(SECTION_RULES)) {
    if (rule.category === 'banner' && rule.params.slotKey) {
      slots.add(rule.params.slotKey);
    }
  }
  return Array.from(slots);
}

export function getRulesBySlot(slotKey: string): SectionRule[] {
  return Object.values(SECTION_RULES).filter(
    rule => rule.category === 'banner' && rule.params.slotKey === slotKey
  );
}
