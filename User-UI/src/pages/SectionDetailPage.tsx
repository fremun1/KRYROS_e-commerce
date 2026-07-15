import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'wouter';
import { fetchHomepageSections, fetchPageSections, fetchProductsPage } from '@/lib/api';
import type { Product } from '@/lib/api';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import { ChevronLeft, Clock, LayoutGrid } from 'lucide-react';

/**
 * SectionDetailPage
 * 
 * Displays all products for a specific section.
 * Accessed via /shop/{dedicatedPageSlug}
 * 
 * This page:
 * - Fetches the section configuration from CMS
 * - Applies the section's product filters
 * - Displays products in a paginated grid
 * - Provides breadcrumb navigation
 */
export default function SectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [section, setSection] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const endDateRef = useRef<Date | null>(null);

  const itemsPerPage = 24;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all sections for shop and homepage
        const [cmsSections, homepageSections] = await Promise.all([
          fetchPageSections('shop'),
          fetchHomepageSections(),
        ]);
        const allSections = [...(cmsSections || []), ...(homepageSections || [])];
        
        // Find section matching the slug
        const matchedSection = allSections?.find(
          (s: any) =>
            s.dedicatedPageSlug === slug ||
            s.config?.sectionSlug === slug ||
            s.id === slug ||
            (slug === "flash-sale" && s.type === "FlashSale")
        );

        if (!matchedSection) {
          setError('Section not found');
          setSection(null);
          setProducts([]);
          return;
        }

        setSection(matchedSection);

        // Build product query params based on section config
        const params: any = {
          skip: (page - 1) * itemsPerPage,
          take: itemsPerPage,
        };

        // Apply section-specific filters
        const config = matchedSection.config || {};
        
        // Spread all config values first (handles categoryId, categorySlug, popularity, etc.)
        Object.assign(params, config);

        // Normalize filterType to query params
        if (config.filterType === 'Featured' || config.filter_by === 'Featured') {
          params.featured = true;
        } else if (config.filterType === 'Best Selling') {
          params.popularity = 'bestseller';
        } else if (config.filterType === 'New Arrivals') {
          params.popularity = 'new';
        } else if (config.filterType === 'Trending') {
          params.popularity = 'trending';
        }

        // Handle special section types
        const sType = matchedSection.type || '';
        if (sType === 'FlashSale' || config.isFlashSale === true || config.isFlashSale === 'true') {
          params.isFlashSale = true;
        } else if (sType === 'TopSelling' || sType === 'BestSellers') {
          if (!params.popularity) params.popularity = 'bestseller';
        } else if (sType === 'Trending') {
          if (!params.popularity) params.popularity = 'trending';
        } else if (sType === 'NewestArrivals') {
          if (!params.popularity) params.popularity = 'new';
        } else if (sType === 'FeaturedProducts') {
          params.featured = true;
        }

        const result = await fetchProductsPage(params);
        setProducts(result.data || []);
        setTotal(Number(result.meta?.total || result.data?.length || 0));
      } catch (err) {
        console.error('Failed to load section:', err);
        setError('Failed to load section');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, page]);

  const totalPages = Math.ceil(total / itemsPerPage);

  const sectionConfig = useMemo(() => {
    return section?.config || {};
  }, [section]);

  const isFlashSale = useMemo(() => {
    if (!section) return false;
    return section.type === 'FlashSale' || sectionConfig.isFlashSale === true || sectionConfig.isFlashSale === 'true';
  }, [section, sectionConfig]);

  const showTimer = useMemo(() => {
    return isFlashSale || sectionConfig.showTimer === true || sectionConfig.showTimer === 'true';
  }, [isFlashSale, sectionConfig]);

  const accentColor = useMemo(() => {
    if (sectionConfig.accentColor) return sectionConfig.accentColor;
    return isFlashSale ? "#ef4444" : "var(--color-primary, #0d9488)";
  }, [isFlashSale, sectionConfig]);

  const headerBgColor = sectionConfig.headerBgColor;

  useEffect(() => {
    if (!showTimer || products.length === 0) return;

    const timestamps = products
      .filter((p) => p.flashSaleEnd)
      .map((p) => new Date(p.flashSaleEnd!).getTime())
      .filter((t) => !isNaN(t));

    let end = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    if (!end) {
      if (sectionConfig.endTime) {
        end = new Date(sectionConfig.endTime);
      } else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }
    }
    endDateRef.current = end;

    const tick = setInterval(() => {
      const totalSeconds = Math.max(0, Math.floor((endDateRef.current!.getTime() - Date.now()) / 1000));
      setTimeLeft({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [showTimer, products, sectionConfig.endTime]);

  const fmt = (v: number) => String(v).padStart(2, '0');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading section...</p>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Section not found'}</p>
          <a href="/shop" className="inline-flex items-center gap-2 text-primary hover:underline">
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* ── Sticky header ── */}
      <div 
        className={`sticky top-0 z-20 border-b border-border ${headerBgColor ? "text-white" : "bg-background/95 backdrop-blur-sm"}`}
        style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <button onClick={() => window.history.back()} className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors flex-shrink-0 ${headerBgColor ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/80"}`}>
            <ChevronLeft className={`w-5 h-5 ${headerBgColor ? "text-white" : "text-foreground"}`} />
          </button>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black truncate leading-tight">
                {section.title || section.name}
              </h1>
              {showTimer && products.length > 0 && (
                <div className={`flex items-center gap-1 font-bold ml-2 ${headerBgColor ? "text-white" : "text-primary"}`}>
                  <Clock className="w-3.5 h-3.5 mr-0.5" />
                  <span className="text-xs bg-black/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.hours)}h</span>
                  <span className="text-xs bg-black/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.minutes)}m</span>
                  <span className="text-xs bg-black/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.seconds)}s</span>
                </div>
              )}
            </div>
            <p className="text-[10px] leading-none mt-0.5 opacity-70">
              {total} products available
            </p>
          </div>

          <div className={`flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 ${headerBgColor ? "bg-white/10" : "bg-muted"}`}>
            <LayoutGrid className={`w-5 h-5 ${headerBgColor ? "text-white" : "text-muted-foreground"}`} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Description Banner if exists */}
        {(section.subtitle || section.description) && (
          <div className="mb-8 p-6 rounded-2xl bg-muted/30 border border-border/50">
            {section.subtitle && <p className="text-lg font-bold text-foreground mb-2">{section.subtitle}</p>}
            {section.description && <p className="text-muted-foreground leading-relaxed">{section.description}</p>}
          </div>
        )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {products.map((product) => (
              <div key={product.id}>
                <UnifiedProductCard product={product} className="w-full" />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-lg ${
                    page === p
                      ? 'bg-primary text-white'
                      : 'border hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No products found in this section.</p>
        </div>
      )}

      {/* Back to Shop */}
      <div className="mt-8 text-center">
        <a href="/shop" className="inline-flex items-center gap-2 text-primary hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Back to Shop
        </a>
      </div>
    </div>
  );
}
