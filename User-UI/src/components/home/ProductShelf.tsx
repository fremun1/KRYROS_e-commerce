import { useState, useEffect, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { type Product, normalizeProduct } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

/**
 * ProductShelf Component
 * 
 * A reusable, generic component for displaying product listings.
 * It fetches products based on a `dataSourceId` (e.g., 'top-selling', 'trending')
 * and renders them according to the provided display configuration.
 * 
 * This component replaces hardcoded sections like TopSellingSection, TrendingSection, etc.
 * It promotes code reuse and makes the system more scalable.
 */

interface ProductShelfProps {
  // Data source
  title: string;
  subtitle?: string;
  dataSourceId: string; // e.g., 'top-selling', 'trending-products', 'new-arrivals'
  
  // Display options
  limit?: number;
  layout?: 'horizontal-scroll' | 'grid';
  cardStyle?: 'default' | 'compact';
  
  // Navigation
  viewAllHref?: string;
  viewAllText?: string;
  
  // Styling
  accentColor?: string;
  
  // Optional decorative banner above the section
  topBanner?: ReactNode;
  
  // Optional custom loading state
  loadingCount?: number;
  
  // Optional extra query params
  params?: Record<string, any>;
}

export default function ProductShelf({
  title,
  subtitle,
  dataSourceId,
  limit = 8,
  layout = 'horizontal-scroll',
  cardStyle = 'default',
  viewAllHref = '/shop',
  viewAllText = 'See All',
  accentColor,
  topBanner,
  loadingCount = 8,
  params = {}
}: ProductShelfProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try products-by-source first
        let url = new URL(`${API_BASE}/api/cms/sections/products-by-source`);
        url.searchParams.set('dataSourceId', dataSourceId);
        url.searchParams.set('limit', String(limit));
        
        // Add extra params if provided
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        });

        let response = await fetch(url.toString());

        // If that fails or returns empty, try the general products API as fallback
        if (!response.ok || (await response.clone().json()).length === 0) {
          url = new URL(`${API_BASE}/api/products`);
          url.searchParams.set('take', String(limit));
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.set(key, String(value));
            }
          });
          response = await fetch(url.toString());
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle both direct array and { data: [] } response formats
        const productList = Array.isArray(data) ? data : (data.data || []);
        setProducts(productList.map(normalizeProduct).slice(0, limit));
      } catch (err) {
        console.error(`Error fetching products for data source '${dataSourceId}':`, err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [dataSourceId, limit, JSON.stringify(params)]);

  // Don't render if no products and not loading
  if (!loading && products.length === 0) {
    return null;
  }

  // Determine CSS classes based on layout
  const containerClasses = layout === 'grid'
    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
    : 'flex gap-3 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible';

  const cardClasses = layout === 'grid'
    ? 'w-full'
    : 'flex-shrink-0 w-[calc(50vw-20px)] md:w-full';

  return (
    <section className="pb-4 md:pb-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Optional decorative banner above header */}
        {topBanner}

        {/* Section header */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3">
          <div className="min-w-0">
            <h2 
              className="text-[20px] leading-[28px] font-bold text-foreground tracking-tight"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] leading-[18px] text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <a
            href={viewAllHref}
            className="flex items-center gap-0.5 text-[14px] font-semibold text-primary hover:text-primary/80 transition-colors shrink-0 whitespace-nowrap ml-4"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {viewAllText}
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </a>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className={`px-4 md:px-6 ${containerClasses}`}>
            {Array.from({ length: loadingCount }).map((_, i) => (
              <div
                key={i}
                className={`${cardClasses} bg-muted rounded-2xl animate-pulse`}
                style={{ aspectRatio: cardStyle === 'compact' ? '3/4' : '1/1' }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 md:px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        ) : (
          /* Product cards */
          <div className={`px-4 md:px-6 ${containerClasses}`}>
            {products.map((product) => (
              <div key={product.id} className={cardClasses}>
                <UnifiedProductCard
                  product={product}
                  className="w-full"
                  imageStyle={cardStyle === 'compact' ? 'cover' : 'contain'}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
