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
  category: 'products' | 'banner' | 'category' | 'custom';
  params: Record<string, any>;
  icon?: string;
}

export const SECTION_RULES: Record<string, SectionRule> = {
  // ─────────────────────────────────────────────────────────────────
  // BANNER SLOTS (for BannerSlot template)
  // ─────────────────────────────────────────────────────────────────
  // Banners are positioned in specific "slots" on the page.
  // Each slot can contain multiple banners, displayed in order.

  'homepage-hero-slider': {
    id: 'homepage-hero-slider',
    label: 'Homepage Hero Slider',
    description: 'Main hero banner slider at the top of homepage.',
    category: 'banner',
    params: { slotKey: 'homepage-hero-slider' },
    icon: '🎬'
  },

  'homepage-after-flash-sale': {
    id: 'homepage-after-flash-sale',
    label: 'After Flash Sale Banner',
    description: 'Banner positioned after the flash sale section.',
    category: 'banner',
    params: { slotKey: 'homepage-after-flash-sale' },
    icon: '📍'
  },

  'homepage-mid-page': {
    id: 'homepage-mid-page',
    label: 'Mid-Page Banner',
    description: 'Banner positioned in the middle of the homepage.',
    category: 'banner',
    params: { slotKey: 'homepage-mid-page' },
    icon: '📍'
  },

  'shop-page-top': {
    id: 'shop-page-top',
    label: 'Shop Page Top Banner',
    description: 'Banner at the top of the shop page.',
    category: 'banner',
    params: { slotKey: 'shop-page-top' },
    icon: '📍'
  },

  'get-now-page-top': {
    id: 'get-now-page-top',
    label: 'Get Now Page Top Banner',
    description: 'Banner at the top of the get now page.',
    category: 'banner',
    params: { slotKey: 'get-now-page-top' },
    icon: '📍'
  },

  'wholesale-page-top': {
    id: 'wholesale-page-top',
    label: 'Wholesale Page Top Banner',
    description: 'Banner at the top of the wholesale page.',
    category: 'banner',
    params: { slotKey: 'wholesale-page-top' },
    icon: '📍'
  },

  // ─────────────────────────────────────────────────────────────────
  // CATEGORY RULES (for CategoryGrid template)
  // ─────────────────────────────────────────────────────────────────

  'homepage-categories': {
    id: 'homepage-categories',
    label: 'Homepage Categories Grid',
    description: 'Display product categories in a grid on the homepage.',
    category: 'category',
    params: { showOnHome: true },
    icon: '🏷️'
  },

  'shop-page-categories': {
    id: 'shop-page-categories',
    label: 'Shop Page Categories',
    description: 'Display product categories on the shop page.',
    category: 'category',
    params: { showOnShop: true },
    icon: '🏷️'
  },

  'all-categories': {
    id: 'all-categories',
    label: 'All Categories',
    description: 'Display all available product categories.',
    category: 'category',
    params: {},
    icon: '🏷️'
  },

  // ─────────────────────────────────────────────────────────────────
  // PRODUCT-BASED RULES (for ProductShelf template)
  // ─────────────────────────────────────────────────────────────────

  'top-selling': {
    id: 'top-selling',
    label: 'Top Selling Products',
    description: 'Products ordered by total sales count (most ordered first).',
    category: 'products',
    params: { popularity: 'bestseller' },
    icon: '📊'
  },

  'trending-products': {
    id: 'trending-products',
    label: 'Trending Products',
    description: 'Products gaining popularity (ordered by recent orders + wishlist count).',
    category: 'products',
    params: { popularity: 'trending' },
    icon: '🔥'
  },

  'new-arrivals': {
    id: 'new-arrivals',
    label: 'New Arrivals',
    description: 'Latest products added to the store (ordered by creation date).',
    category: 'products',
    params: { popularity: 'new' },
    icon: '✨'
  },

  'hot-products': {
    id: 'hot-products',
    label: 'Hot Products',
    description: 'Products with the most wishlist saves (most wishlisted first).',
    category: 'products',
    params: { popularity: 'hot' },
    icon: '🌡️'
  },

  'flash-sales': {
    id: 'flash-sales',
    label: 'Flash Sales',
    description: 'Products with active flash sale pricing.',
    category: 'products',
    params: { isFlashSale: true },
    icon: '⚡'
  },

  'featured-products': {
    id: 'featured-products',
    label: 'Featured Products',
    description: 'Manually featured products (hand-picked by admin).',
    category: 'products',
    params: { featured: true },
    icon: '⭐'
  },

  'sale-items': {
    id: 'sale-items',
    label: 'Sale Items',
    description: 'Products with active sales or flash sale pricing.',
    category: 'products',
    params: { popularity: 'sale' },
    icon: '🏷️'
  },

  'credit-eligible': {
    id: 'credit-eligible',
    label: 'Get Now Eligible',
    description: 'Products available for purchase on credit (Get Now).',
    category: 'products',
    params: { allowCredit: true },
    icon: '💳'
  },

  'wholesale-products': {
    id: 'wholesale-products',
    label: 'Wholesale Products',
    description: 'Products available for wholesale/bulk purchase.',
    category: 'products',
    params: { isWholesaleOnly: true },
    icon: '📦'
  },

  // ─────────────────────────────────────────────────────────────────
  // CATEGORY-BASED RULES
  // ─────────────────────────────────────────────────────────────────

  'categories-grid': {
    id: 'categories-grid',
    label: 'Categories Grid',
    description: 'Display all active product categories in a grid layout.',
    category: 'category',
    params: {},
    icon: '🏷️'
  },

  'homepage-categories': {
    id: 'homepage-categories',
    label: 'Homepage Categories',
    description: 'Display categories marked for homepage display.',
    category: 'category',
    params: { showOnHome: true },
    icon: '🏠'
  },

  // ─────────────────────────────────────────────────────────────────
  // CUSTOM RULES (for special sections)
  // ─────────────────────────────────────────────────────────────────

  'recently-viewed': {
    id: 'recently-viewed',
    label: 'Recently Viewed',
    description: 'Products the user has recently viewed (client-side, localStorage).',
    category: 'custom',
    params: { clientSide: true },
    icon: '👁️'
  },

  'recommended-for-you': {
    id: 'recommended-for-you',
    label: 'Recommended For You',
    description: 'Products recommended based on user browsing history.',
    category: 'custom',
    params: { personalized: true },
    icon: '💡'
  }
};

/**
 * Get a rule by its ID
 * @param ruleId The unique identifier of the rule
 * @returns The rule object, or null if not found
 */
export function getRule(ruleId: string): SectionRule | null {
  return SECTION_RULES[ruleId] || null;
}

/**
 * Get all rules
 * @returns Array of all available rules
 */
export function getAllRules(): SectionRule[] {
  return Object.values(SECTION_RULES);
}

/**
 * Get rules by category
 * @param category The category to filter by
 * @returns Array of rules in the specified category
 */
export function getRulesByCategory(category: SectionRule['category']): SectionRule[] {
  return Object.values(SECTION_RULES).filter(rule => rule.category === category);
}

/**
 * Validate that a rule ID exists
 * @param ruleId The rule ID to validate
 * @returns true if the rule exists, false otherwise
 */
/**
 * Validate that a rule ID exists
 * @param ruleId The rule ID to validate
 * @returns true if the rule exists, false otherwise
 */
export function isValidRuleId(ruleId: string): boolean {
  return ruleId in SECTION_RULES;
}

/**
 * Get all available banner slots
 * @returns Array of unique slot keys
 */
export function getAllBannerSlots(): string[] {
  const slots = new Set<string>();
  for (const rule of Object.values(SECTION_RULES)) {
    if (rule.category === 'banner' && rule.params.slotKey) {
      slots.add(rule.params.slotKey);
    }
  }
  return Array.from(slots);
}

/**
 * Get all rules for a specific slot
 * @param slotKey The slot key to filter by
 * @returns Array of rules for that slot
 */
export function getRulesBySlot(slotKey: string): SectionRule[] {
  return Object.values(SECTION_RULES).filter(
    rule => rule.category === 'banner' && rule.params.slotKey === slotKey
  );
}
