import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, LayoutGrid, Filter } from "lucide-react";
import { fetchCategories, fetchPageSections, fetchProducts } from "@/lib/api";
import type { ApiCMSSection, ApiCategory, Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

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
  const [, params] = useRoute("/shop/section/:slug");
  const slug = params?.slug ? decodeURIComponent(params.slug) : "all";

  const [sections, setSections] = useState<ApiCMSSection[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [skip, setSkip] = useState(0);
  const [take] = useState(24);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPageSections("shop"), fetchCategories()])
      .then(([secs, cats]) => {
        setSections((secs || []).filter((s) => s.isActive !== false));
        setCategories((cats || []).filter((c: any) => c.isActive !== false));
      })
      .finally(() => setLoading(false));
  }, []);

  const resolved = useMemo(() => {
    const matchByCfg = sections.find((s) => {
      const cfg = (s.config ?? {}) as Record<string, unknown>;
      return toStr(cfg.sectionSlug).toLowerCase() === slug.toLowerCase();
    });
    if (matchByCfg) return { kind: "cms" as const, section: matchByCfg };

    const matchCat = categories.find(
      (c) => (c.slug || c.id).toLowerCase() === slug.toLowerCase()
    );
    if (matchCat) return { kind: "category" as const, category: matchCat };

    return { kind: "all" as const };
  }, [sections, categories, slug]);

  const buildQuery = useMemo(() => {
    if (resolved.kind === "cms") {
      const cfg = (resolved.section.config ?? {}) as Record<string, unknown>;
      const q: any = {};
      const categorySlug = toStr(cfg.categorySlug);
      const popularity = toStr(cfg.popularity);
      if (categorySlug) q.categorySlug = categorySlug;
      if (popularity) q.popularity = popularity;
      if (cfg.isFlashSale !== undefined) q.isFlashSale = toBool(cfg.isFlashSale);
      if (cfg.featured !== undefined) q.featured = toBool(cfg.featured);
      return q;
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
  const isFlashSale = useMemo(() => {
    if (resolved.kind !== "cms") return false;
    const cfg = (resolved.section.config ?? {}) as Record<string, unknown>;
    return toBool(cfg.isFlashSale);
  }, [resolved]);

  const accentColor = isFlashSale ? "#ef4444" : "var(--color-primary, #0d9488)";

  const load = async (nextSkip: number, append: boolean) => {
    const result = await fetchProducts({ ...buildQuery, take, skip: nextSkip });
    setTotalLoaded(result.length);
    setProducts((prev) => (append ? prev.concat(result) : result));
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
    <div className="pb-24 md:pb-10 min-h-screen">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 flex items-center gap-3">
          {/* Back */}
          <Link href="/shop">
            <a className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </a>
          </Link>

          {/* Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Accent bar */}
            <div
              className="flex-shrink-0 w-1 h-5 rounded-full"
              style={{ background: accentColor }}
            />
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-black text-foreground truncate leading-tight">
                {pageTitle}
              </h1>
              {products.length > 0 && !initialLoad && (
                <p className="text-[10px] text-muted-foreground leading-none">
                  {products.length}
                  {showLoadMore ? "+" : ""} products
                </p>
              )}
            </div>
          </div>

          {/* Grid icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted flex-shrink-0">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
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
            <Link href="/shop">
              <a className="mt-4 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
                ← Back to Shop
              </a>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pb-4">
              {products.map((p) => (
                <UnifiedProductCard key={p.id} product={p} className="w-full" />
              ))}
            </div>

            {/* Load More */}
            {showLoadMore && (
              <div className="flex justify-center pb-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="group flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-primary text-primary text-sm font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
