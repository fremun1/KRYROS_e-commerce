import { useState, useEffect, useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { EFFECTIVE_API_BASE } from "@/lib/api";
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
  showTimer?: boolean;
  showPercent?: boolean;
  
  // Navigation
  viewAllHref?: string;
  viewAllText?: string;
  
  // Styling
  accentColor?: string;
  headerBgColor?: string;
  textColor?: string;  // Separate text color for heading (independent of background)
  
  // Layout control
  titleAlign?: 'left' | 'center' | 'right';
  showSeeAll?: boolean;

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
  showTimer = false,
  showPercent = false,
  viewAllHref = '/shop',
  viewAllText = 'See All',
  accentColor,
  headerBgColor,
  textColor,
  titleAlign = 'left',
  showSeeAll = true,
  topBanner,
  loadingCount = 8,
  params = {}
}: ProductShelfProps) {
  // ─── ALL hooks must be declared first, before any conditional returns ───
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer state - MUST be here before any early return to avoid React error #300
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [saleEnded, setSaleEnded] = useState(false);
  const endDateRef = useRef<Date | null>(null);

  const activeCategory = typeof params?.categorySlug === 'string' ? params.categorySlug.trim() : '';
  const activeBrand = typeof params?.brandSlug === 'string' ? params.brandSlug.trim() : '';
  const hasScopedFilter = Boolean(activeCategory || activeBrand);
  const emptyStateMessage = hasScopedFilter
    ? `No products matched${activeBrand ? ` brand "${activeBrand}"` : ''}${activeBrand && activeCategory ? ' in' : ''}${activeCategory ? ` category "${activeCategory}"` : ''}.`
    : 'No products are available in this section yet.';

  // Fetch products
  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try products-by-source first
        const apiPath = `${EFFECTIVE_API_BASE}/api/cms/sections/products-by-source`;
        let url: URL;
        try {
          url = new URL(apiPath);
        } catch {
          url = new URL(apiPath, window.location.origin);
        }

        // If it's a dynamic-query or we have params, ensure we use the right dataSourceId
        const effectiveSourceId = dataSourceId || "dynamic-query";
        url.searchParams.set("dataSourceId", effectiveSourceId);
        url.searchParams.set("limit", String(limit));

        const normalizedParams = { ...params };
        if (normalizedParams.sortBy === "price-asc") {
          normalizedParams.sortBy = "price";
          normalizedParams.order = "asc";
        } else if (normalizedParams.sortBy === "price-desc") {
          normalizedParams.sortBy = "price";
          normalizedParams.order = "desc";
        } else if (normalizedParams.sortBy === "popularity") {
          normalizedParams.sortBy = "sales";
          normalizedParams.order = "desc";
        } else if (normalizedParams.sortBy === "newest") {
          normalizedParams.sortBy = "createdAt";
          normalizedParams.order = "desc";
        }

        // Add all params from the config object
        if (normalizedParams) {
          Object.entries(normalizedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              url.searchParams.set(key, String(value));
            }
          });
        }

        let response = await fetch(url.toString(), { signal: controller.signal });

        // Fallback logic for legacy or empty responses
        if (!response.ok) {
          const fallbackPath = `${EFFECTIVE_API_BASE}/api/products`;
          try {
            url = new URL(fallbackPath);
          } catch {
            url = new URL(fallbackPath, window.location.origin);
          }
          url.searchParams.set("take", String(limit));
          if (normalizedParams) {
            Object.entries(normalizedParams).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== "") {
                url.searchParams.set(key, String(value));
              }
            });
          }
          response = await fetch(url.toString(), { signal: controller.signal });
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }

        const data = await response.json();

        // Handle both direct array and { data: [] } response formats
        const productList = Array.isArray(data) ? data : data.data || [];
        setProducts(productList.map(normalizeProduct).slice(0, limit));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error(
          `Error fetching products for data source '${dataSourceId}':`,
          err
        );
        setError(err instanceof Error ? err.message : "Failed to load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [dataSourceId, limit, JSON.stringify(params)]);

  // Timer effect - also before early return
  useEffect(() => {
    if (!showTimer || products.length === 0) return;

    // Set end date to end of today or earliest product flashSaleEnd
    const timestamps = products
      .filter((p) => p.flashSaleEnd)
      .map((p) => new Date(p.flashSaleEnd!).getTime())
      .filter((t) => !isNaN(t));
    
    let end = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    if (!end) {
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }
    endDateRef.current = end;

    const tick = setInterval(() => {
      const totalSeconds = Math.max(0, Math.floor((endDateRef.current!.getTime() - Date.now()) / 1000));
      setTimeLeft({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
      if (totalSeconds === 0) {
        setSaleEnded(true);
        clearInterval(tick);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [showTimer, products]);

  // Determine CSS classes based on layout
  const containerClasses = layout === 'grid'
    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
    : 'flex gap-3 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible';

  const cardClasses = layout === 'grid'
    ? 'w-full'
    : 'flex-shrink-0 w-[calc(50vw-20px)] md:w-full';

  const fmt = (v: number) => String(v).padStart(2, '0');

  return (
    <section className="pb-4 md:pb-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Optional decorative banner above header */}
        {topBanner}

        {/* Section header */}
        <div 
          className={
            titleAlign === 'center'
              ? `flex flex-col items-center justify-center text-center px-4 md:px-6 py-4 gap-2 ${headerBgColor ? 'mb-4' : ''}`
              : titleAlign === 'right'
              ? `flex flex-row-reverse items-center justify-between px-4 md:px-6 py-3 ${headerBgColor ? 'mb-4' : ''}`
              : `flex items-center justify-between px-4 md:px-6 py-3 ${headerBgColor ? 'mb-4' : ''}`
          }
          style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
        >
          <div className={
            titleAlign === 'center'
              ? 'flex flex-col items-center justify-center text-center min-w-0'
              : titleAlign === 'right'
              ? 'text-right min-w-0'
              : 'min-w-0'
          }>
            <div className={
              titleAlign === 'center'
                ? 'flex flex-col sm:flex-row items-center justify-center gap-2'
                : titleAlign === 'right'
                ? 'flex flex-row-reverse items-center gap-3'
                : 'flex items-center gap-3'
            }>
              <h2 
                className="text-[20px] leading-[28px] font-bold tracking-tight"
                style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
              >
                {title}
              </h2>
              
              {showTimer && !loading && products.length > 0 && (
                <div className={`flex items-center gap-1.5 ${titleAlign === 'center' ? 'justify-center mt-1 sm:mt-0 sm:ml-2' : titleAlign === 'right' ? 'mr-2' : 'ml-2'}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider opacity-80 ${headerBgColor ? 'text-white' : 'text-muted-foreground'}`}>
                    Ends in:
                  </span>
                  <div className={`flex items-center gap-1 font-bold ${headerBgColor ? 'text-white' : 'text-primary'}`}>
                    <span className="text-sm bg-kryros-primary/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.hours)}h</span>
                    <span className="text-sm bg-kryros-primary/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.minutes)}m</span>
                    <span className="text-sm bg-kryros-primary/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.seconds)}s</span>
                  </div>
                </div>
              )}
            </div>
            {subtitle && (
              <p className={`text-[13px] leading-[18px] mt-0.5 ${headerBgColor ? 'text-white/80' : 'text-muted-foreground'} ${titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left'}`}>
                {subtitle}
              </p>
            )}
          </div>

          {showSeeAll && (
            <a
              href={viewAllHref}
              className={`flex items-center gap-0.5 text-[14px] font-semibold hover:opacity-80 transition-colors shrink-0 whitespace-nowrap ${titleAlign === 'center' ? 'mt-2' : titleAlign === 'right' ? 'mr-4' : 'ml-4'}`}
              style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
            >
              {viewAllText}
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </a>
          )}
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
        ) : products.length === 0 ? (
          <div className="px-4 md:px-6">
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                {title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {emptyStateMessage}
              </p>
            </div>
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
                  showDiscountBadge={showPercent}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
