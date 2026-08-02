import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, LayoutGrid, Filter } from "lucide-react";
import { fetchCategories, fetchSectionByIdOrSlug, fetchProducts, EFFECTIVE_API_BASE, normalizeProduct } from "@/lib/api";
import type { ApiCMSSection, ApiCategory, Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";
import { inferPageContext, getPageContextBasePath, getPageContextDisplayPath } from "@/lib/pageContext";

function toBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return fallback;
}
function toNum(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function toStr(v: unknown, fallback = "") {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

// Product card skeleton
function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-7 bg-muted rounded mt-2" />
      </div>
    </div>
  );
}

export default function ShopSectionPage() {
  const [location] = useLocation();
  const pageContext = useMemo(() => inferPageContext(location), [location]);
  const pageBasePath = useMemo(() => getPageContextDisplayPath(pageContext), [pageContext]);
  const internalBasePath = useMemo(() => getPageContextBasePath(pageContext), [pageContext]);

  const [, params] = useRoute(`${internalBasePath}/section/:slug`);
  const slug = params?.slug ? decodeURIComponent(params.slug) : "all";

  const [section, setSection] = useState<ApiCMSSection | null>(null);
  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [skip, setSkip] = useState(0);
  const [take] = useState(24);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const endDateRef = useRef<Date | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true);
      try {
        // 1. Try to fetch as a CMS section directly from backend
        // Use pageContext to avoid collisions
        const cmsSection = await fetchSectionByIdOrSlug(slug, pageContext);
        if (cmsSection) {
          setSection(cmsSection);
          setCategory(null);
          return;
        }

        // 2. Fallback to category lookup
        const cats = await fetchCategories();
        const matchCat = cats?.find(
          (c: any) => (c.slug || c.id).toLowerCase() === slug.toLowerCase()
        );
        if (matchCat) {
          setCategory(matchCat);
          setSection(null);
        } else {
          setSection(null);
          setCategory(null);
        }
      } catch (err) {
        console.error("Error loading section metadata:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [slug, pageContext]);

  const resolved = useMemo(() => {
    if (section) return { kind: "cms" as const, section };
    if (category) return { kind: "category" as const, category };
    return { kind: "all" as const };
  }, [section, category]);

  const buildQuery = useMemo(() => {
    if (resolved.kind === "cms") {
      const section = resolved.section as any;
      const cfg = (section.config ?? {}) as Record<string, any>;
      const dataSourceId = section.dataSourceId || "";
      
      // 1. Define base parameters from dataSourceId (mirroring backend section-rules.ts)
      const ruleParams: Record<string, any> = {};
      if (dataSourceId === "top-selling") ruleParams.popularity = "bestseller";
      else if (dataSourceId === "trending-products") ruleParams.popularity = "trending";
      else if (dataSourceId === "new-arrivals") ruleParams.popularity = "new";
      else if (dataSourceId === "flash-sales") ruleParams.isFlashSale = true;
      else if (dataSourceId === "featured-products") ruleParams.isFeatured = true;
      else if (dataSourceId === "sale-items") ruleParams.popularity = "sale";
      else if (dataSourceId === "credit-eligible") ruleParams.allowCredit = true;
      else if (dataSourceId === "wholesale-products") ruleParams.isWholesaleOnly = true;

      // 2. Fallback for legacy section types if dataSourceId is missing
      const sectionType = section.type || "";
      if (!dataSourceId) {
        if (sectionType === "TopSelling" || sectionType === "BestSellers") ruleParams.popularity = "bestseller";
        else if (sectionType === "Trending") ruleParams.popularity = "trending";
        else if (sectionType === "NewestArrivals") ruleParams.popularity = "new";
        else if (sectionType === "FlashSale") ruleParams.isFlashSale = true;
        else if (sectionType === "FeaturedProducts") ruleParams.isFeatured = true;
      }

      // 3. Merge everything: Rule Defaults < CMS Config < URL Query Params
      // This makes the system fully flexible for any new dataSourceId or custom config
      const params: Record<string, any> = {
        ...ruleParams,
        ...cfg,
        // Ensure UI-specific config doesn't break API
        dataSourceId: undefined, 
        sectionSlug: undefined,
        title: undefined,
        subtitle: undefined,
      };

      // Map isFeatured to featured for backend consistency
      if (params.isFeatured !== undefined) {
        params.featured = params.isFeatured;
        delete params.isFeatured;
      }

      return params;
    }
    if (resolved.kind === "category") {
      return { categorySlug: resolved.category.slug || resolved.category.id };
    }
    return {};
  }, [resolved]);

  const pageTitle = useMemo(() => {
    if (resolved.kind === "cms") {
      const cfg = (resolved.section.config ?? {}) as Record<string, unknown>;
      return toStr(cfg.title, resolved.section.title || "Shop");
    }
    if (resolved.kind === "category") return resolved.category.name;
    return "All Products";
  }, [resolved]);

  // Detect flash sale for accent color
  const sectionConfig = useMemo(() => {
    if (resolved.kind !== "cms") return {};
    return (resolved.section.config ?? {}) as Record<string, any>;
  }, [resolved]);

  const isFlashSale = useMemo(() => {
    if (resolved.kind !== "cms") return false;
    const sType = (resolved.section as any).type || "";
    return toBool(sectionConfig.isFlashSale) || sType === "FlashSale";
  }, [resolved, sectionConfig]);

  const showTimer = useMemo(() => {
    return isFlashSale || toBool(sectionConfig.showTimer);
  }, [isFlashSale, sectionConfig]);
  const showPercent = useMemo(() => toBool(sectionConfig.showPercent, true), [sectionConfig]);
  const sectionSubtitle = useMemo(() => {
    if (resolved.kind !== "cms") return "";
    return toStr(sectionConfig.subtitle, resolved.section.subtitle || "");
  }, [resolved, sectionConfig]);

  const accentColor = useMemo(() => {
    if (sectionConfig.accentColor) return sectionConfig.accentColor;
    return isFlashSale ? "var(--kryros-error)" : "var(--kryros-primary)";
  }, [isFlashSale, sectionConfig]);

  const headerBgColor = sectionConfig.headerBgColor;

  // Timer logic
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

  const fmt = (v: number) => String(v).padStart(2, "0");

  const load = async (nextSkip: number, append: boolean) => {
    if (!append) setLoadingMore(true);
    if (nextSkip === 0 && !append) setInitialLoad(true);

    try {
      if (resolved.kind === "cms") {
        const section = resolved.section;
        const apiPath = `${EFFECTIVE_API_BASE}/api/cms/sections/products-by-source`;
        const url = new URL(apiPath, window.location.origin);

        // Get derived rule params from buildQuery
        const derivedParams = buildQuery;

        const effectiveSourceId = section.dataSourceId || (derivedParams as any).dataSourceId || 'dynamic-query';
        url.searchParams.set('dataSourceId', effectiveSourceId);
        url.searchParams.set('limit', String(take));
        url.searchParams.set('skip', String(nextSkip));

        // Add derived params
        Object.entries(derivedParams).forEach(([key, value]) => {
          if (key === 'dataSourceId') return;
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
          }
        });

        // Merge with any other params from the section config not covered by buildQuery
        const cfg = (section.config ?? {}) as Record<string, any>;
        Object.entries(cfg).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' &&
              !['dataSourceId', 'sectionSlug', 'title', 'subtitle', 'layout', 'limit', 'showTimer', 'showPercent'].includes(key)) {
            if (!url.searchParams.has(key)) {
              url.searchParams.set(key, String(value));
            }
          }
        });

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          const productList = Array.isArray(data) ? data : (data.data || []);
          const normalized = productList.map(normalizeProduct);
          setTotalLoaded(normalized.length);
          setProducts((prev) => (append ? prev.concat(normalized) : normalized));
          return;
        }
      }

      // Fallback for categories or if CMS fetch fails
      const result = await fetchProducts({ ...buildQuery, take, skip: nextSkip });
      setTotalLoaded(result.length);
      setProducts((prev) => (append ? prev.concat(result) : result));
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingMore(false);
      if (nextSkip === 0 && !append) setInitialLoad(false);
    }
  };

  useEffect(() => {
    setSkip(0);
    setProducts([]);
    setTotalLoaded(0);
    setInitialLoad(true);
    if (!loading) {
      load(0, false).finally(() => setInitialLoad(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, loading, JSON.stringify(buildQuery)]);

  const handleLoadMore = async () => {
    const next = skip + take;
    setLoadingMore(true);
    try {
      await load(next, true);
      setSkip(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const showLoadMore = totalLoaded === take;

  return (
    <div className="pb-6 md:pb-10 min-h-screen">
      {/* Loading skeleton */}
      {initialLoad && (
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Sticky header ── */}
      <div 
        className={`sticky top-0 z-20 border-b border-border ${headerBgColor ? "text-white" : "bg-background/95 backdrop-blur-sm"}`}
        style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
      >
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-16 flex items-center gap-3">
          {/* Back */}
          <Link href={pageBasePath}>
            <a className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors flex-shrink-0 ${headerBgColor ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/80"}`}>
              <ArrowLeft className={`w-5 h-5 ${headerBgColor ? "text-white" : "text-foreground"}`} />
            </a>
          </Link>

          {/* Title & Info */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1
                className="text-base md:text-lg font-black truncate leading-tight"
                style={accentColor && !headerBgColor ? { color: accentColor } : undefined}
              >
                {pageTitle}
              </h1>
              {showTimer && products.length > 0 && (
                <div className={`flex items-center gap-1 font-bold ml-2 ${headerBgColor ? "text-white" : "text-primary"}`}>
                  <span className="text-[10px] uppercase opacity-70 mr-1 hidden sm:inline">Ends in:</span>
                  <span className="text-xs bg-kryros-primary/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.hours)}h</span>
                  <span className="text-xs bg-kryros-primary/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.minutes)}m</span>
                  <span className="text-xs bg-kryros-primary/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.seconds)}s</span>
                </div>
              )}
            </div>
            {sectionSubtitle && (
              <p className={`text-[11px] leading-tight mt-0.5 truncate ${headerBgColor ? "text-white/80" : "text-muted-foreground"}`}>
                {sectionSubtitle}
              </p>
            )}
            {products.length > 0 && !initialLoad && (
              <p className={`text-[10px] leading-none mt-0.5 opacity-70`}>
                {products.length}{showLoadMore ? "+" : ""} products available
              </p>
            )}
          </div>

          {/* Layout Toggle / Icon */}
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 ${headerBgColor ? "bg-white/10" : "bg-muted"}`}>
            <LayoutGrid className={`w-5 h-5 ${headerBgColor ? "text-white" : "text-muted-foreground"}`} />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 pt-4">
        {initialLoad ? (
          /* Skeleton grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pb-4">
            {[...Array(8)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <LayoutGrid className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-bold text-foreground">No products found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              This section doesn't have any products yet. Check back soon!
            </p>
            <Link href={pageBasePath}>
              <a className="mt-4 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
                ← Back to {pageContext.charAt(0).toUpperCase() + pageContext.slice(1)}
              </a>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pb-4">
              {products.map((p) => (
                <UnifiedProductCard
                  key={p.id}
                  product={p}
                  className="w-full"
                  showDiscountBadge={showPercent}
                />
              ))}
            </div>

            {/* Load More */}
            {showLoadMore && (
              <div className="flex justify-center pb-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="group flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-primary text-primary text-sm font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={accentColor && !headerBgColor ? { borderColor: accentColor, color: accentColor } : undefined}
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading…
                    </>
                  ) : (
                    "Load More Products"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
