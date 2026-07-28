import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SECTION_RULES, getRule, getAllRules, getRulesByCategory, SectionRule } from './section-rules';
import { ProductsService } from '../products/products.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SectionDataSourceService
 * 
 * This service is responsible for:
 * 1. Providing access to section rules (data sources)
 * 2. Fetching products based on a section rule
 * 3. Validating rule IDs
 * 
 * It acts as a bridge between the CMS (which stores dataSourceId references)
 * and the ProductsService (which performs the actual product queries).
 */
@Injectable()
export class SectionDataSourceService {
  private readonly logger = new Logger(SectionDataSourceService.name);

  constructor(
    private productsService: ProductsService,
    private prisma: PrismaService
  ) {}

  /**
   * Get a single rule by ID
   * @param ruleId The unique identifier of the rule
   * @returns The rule object
   * @throws NotFoundException if the rule does not exist
   */
  getRule(ruleId: string): SectionRule {
    const rule = getRule(ruleId);
    if (!rule) {
      this.logger.warn(`Rule not found: ${ruleId}`);
      throw new NotFoundException(`Section rule '${ruleId}' not found`);
    }
    return rule;
  }

  /**
   * Get all available rules
   * @returns Array of all rules
   */
  getAllRules(): SectionRule[] {
    return getAllRules();
  }

  /**
   * Get rules by category
   * @param category The category to filter by
   * @returns Array of rules in the specified category
   */
  getRulesByCategory(category: SectionRule['category']): SectionRule[] {
    return getRulesByCategory(category);
  }

  /**
   * Validate that a rule ID exists
   * @param ruleId The rule ID to validate
   * @returns true if valid, false otherwise
   */
  isValidRuleId(ruleId: string): boolean {
    return ruleId in SECTION_RULES;
  }

  private normalizeBrandKey(name?: string | null): string {
    return (name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private dedupeBrands<T extends { id: number; name?: string | null; logo?: string | null; updatedAt?: Date }>(
    brands: T[],
  ): T[] {
    const deduped = new Map<string, T>();

    for (const brand of brands) {
      const key = this.normalizeBrandKey(brand.name) || `brand:${brand.id}`;
      const existing = deduped.get(key);

      if (!existing || (!existing.logo && brand.logo)) {
        deduped.set(key, brand);
        continue;
      }

      if (existing.logo === brand.logo) {
        const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const nextUpdated = brand.updatedAt ? new Date(brand.updatedAt).getTime() : 0;
        if (nextUpdated > existingUpdated) {
          deduped.set(key, brand);
        }
      }
    }

    return Array.from(deduped.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || ''),
    );
  }

  /**
   * Fetch products based on a section rule
   * 
   * This is the core method that translates a rule ID into a product query.
   * It retrieves the rule, extracts its parameters, and calls the ProductsService.
   * 
   * @param ruleId The unique identifier of the rule
   * @param limit Maximum number of products to fetch (default: 8)
   * @param skip Number of products to skip for pagination (default: 0)
   * @returns Object containing products array and metadata
   * @throws NotFoundException if the rule does not exist
   */
  async fetchProductsByRule(
    ruleId: string,
    limit: number = 8,
    skip: number = 0,
    extraParams: Record<string, any> = {}
  ) {
    // If it's a dynamic query, we don't look up a rule, we use the params directly
    let baseParams = {};
    if (ruleId !== 'dynamic-query') {
      const rule = this.getRule(ruleId);
      baseParams = rule.params || {};
    }

    this.logger.debug(`Fetching products for rule: ${ruleId}, limit: ${limit}, skip: ${skip}`);

    try {
      // Merge rule parameters with extra params, but only override if extraParams has a defined value
      // This prevents extraParams from overriding valid rule params with undefined/null
      const params = {
        ...baseParams,
        ...extraParams,
        take: limit,
        skip: skip
      };

      this.logger.debug(`Merged params before cleaning:`, JSON.stringify(params));

      // Remove empty string/null/undefined filter params to avoid breaking queries
      const cleanedParams: any = {};
      for (const [key, value] of Object.entries(params)) {
        const isEmptyString = typeof value === 'string' && value === '';
        if (value !== undefined && value !== null && !isEmptyString) {
          cleanedParams[key] = value;
        }
      }

      // Ensure rule params are preserved even if extraParams had undefined values
      for (const [key, value] of Object.entries(baseParams)) {
        if (value !== undefined && value !== null && cleanedParams[key] === undefined) {
          cleanedParams[key] = value;
        }
      }

      this.logger.debug(`Cleaned params sent to products service:`, JSON.stringify(cleanedParams));

      // Call the ProductsService with the cleaned parameters
      const result = await this.productsService.findAll(cleanedParams);

      this.logger.debug(`Successfully fetched ${result.data?.length || 0} products for rule: ${ruleId}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching products for rule '${ruleId}': ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  /**
   * Fetch brands for a section data source
   */
  async fetchBrandsByRule(
    dataSourceId: string,
    limit: number = 12
  ) {
    this.logger.debug(`Fetching brands for rule: ${dataSourceId}, limit: ${limit}`);
    
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return this.dedupeBrands(brands).slice(0, limit);
  }

  /**
   * Fetch products for multiple rules (useful for homepage with multiple sections)
   * 
   * @param requests Array of { ruleId, limit, skip }
   * @returns Object mapping ruleId to { products, meta }
   */
  async fetchProductsByMultipleRules(
    requests: Array<{ ruleId: string; limit?: number; skip?: number }>
  ) {
    const results: Record<string, any> = {};

    const promises = requests.map(async (req) => {
      try {
        const result = await this.fetchProductsByRule(
          req.ruleId,
          req.limit || 8,
          req.skip || 0
        );
        return { ruleId: req.ruleId, result };
      } catch (error) {
        this.logger.warn(`Failed to fetch products for rule '${req.ruleId}': ${error}`);
        return { 
          ruleId: req.ruleId, 
          result: { data: [], meta: { total: 0, skip: 0, take: 0, error: true } } 
        };
      }
    });

    const resolvedResults = await Promise.all(promises);
    for (const { ruleId, result } of resolvedResults) {
      results[ruleId] = result;
    }

    return results;
  }

  /**
   * Get rule metadata for admin UI
   * 
   * Returns a simplified version of all rules suitable for displaying
   * in dropdown menus and admin interfaces.
   * 
   * @returns Array of { id, label, description, category, icon }
   */
  getRuleMetadata() {
    return this.getAllRules().map(rule => ({
      id: rule.id,
      label: rule.label,
      description: rule.description,
      category: rule.category,
      icon: rule.icon
    }));
  }

  /**
   * Get rule metadata grouped by category
   * 
   * Useful for rendering categorized dropdowns in the admin panel.
   * 
   * @returns Object with categories as keys and arrays of rules as values
   */
  getRuleMetadataGroupedByCategory() {
    const grouped: Record<string, any[]> = {};

    for (const rule of this.getAllRules()) {
      if (!grouped[rule.category]) {
        grouped[rule.category] = [];
      }
      grouped[rule.category].push({
        id: rule.id,
        label: rule.label,
        description: rule.description,
        icon: rule.icon,
        templateType: rule.templateType
      });
    }

    return grouped;
  }
}
