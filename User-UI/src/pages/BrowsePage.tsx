import { useEffect, useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, ChevronRight, Package } from "lucide-react";
import {
  EFFECTIVE_API_BASE,
  fetchPageSections,
  normalizeProduct,
} from "@/lib/api";
import { inferPageContext, getPageContextBasePath, getPageContextDisplayPath, normalizePageContext } from "@/lib/pageContext";
import type { ApiCMSSection, Product } from "@/lib/api";
import DynamicSectionRendererV2 from "@/components/home/DynamicSectionRendererV2";
import RecentlyViewedSection from "@/components/home/RecentlyViewedSection";
import UnifiedProductCard from "@/components/UnifiedProductCard";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * BrowsePage — Unified inner page for categories AND brands
 *
 * URL patterns:
 *   /shop/category/:slug  → shows category banner + filtered products + CMS sections
 *   /shop/brand/:slug     → shows brand banner + filtered products + CMS sections
 *
 * How it works:
 *   - pageSlug = "category-phones" or "brand-samsung"
 *   - Fetches CMS sections assigned to that pageSlug
 *   - Fetches products filtered by categorySlug or brandSlug
 *   - Renders sections first (banners, shelves), then a product grid
 */

// ── Helpers ──────────────────────────────────────────────────────────────────
function toBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return fallback;
}

function matchesBrandProduct(product: Product, brandName: string, brandSlug: string) {
  const normalizedBrandName = brandName.trim().toLowerCase();
  const normalizedBrandSlug = brandSlug.trim().toLowerCase();
  const searchableText = [
    product.brand,
    product.brandSlug,
    product.name,
    product.description,
    product.specs,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (product.brand || "").trim().toLowerCase() === normalizedBrandName ||
    (product.brandSlug || "").trim().toLowerCase() === normalizedBrandSlug ||
    searchableText.includes(normalizedBrandName) ||
    searchableText.includes(normalizedBrandSlug.replace(/-/g, " "))
  );
}

async function fetchBrowseProducts(params: {
  type: "category" | "brand";
  slug: string;
  take: number;
  skip: number;
  brandName?: string | null;
}) {
  const apiPath = `${EFFECTIVE_API_BASE}/api/products`;
  let url: URL;
  try {
    url = new URL(apiPath);
  } catch {
    url = new URL(apiPath, window.location.origin);
  }

  url.searchParams.set("take", String(params.take));
  url.searchParams.set("skip", String(params.skip));

  if (params.type === "category") {
    if (/^\d+$/.test(params.slug)) {
      url.searchParams.set("categoryId", params.slug);
    } else {
      url.searchParams.set("categorySlug", params.slug);
    }
  } else if (/^\d+$/.test(params.slug)) {
    url.searchParams.set("brandId", params.slug);
  } else {
    url.searchParams.set("brandSlug", params.slug);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.data || [];
  const normalizedProducts = list.map(normalizeProduct);

  if (
    params.type !== "brand" ||
    normalizedProducts.length > 0 ||
    !params.brandName ||
    /^\d+$/.test(params.slug)
  ) {
    return normalizedProducts;
  }

  let fallbackUrl: URL;
  try {
    fallbackUrl = new URL(apiPath);
  } catch {
    fallbackUrl = new URL(apiPath, window.location.origin);
  }

  fallbackUrl.searchParams.set("take", String(params.take));
  fallbackUrl.searchParams.set("skip", String(params.skip));
  fallbackUrl.searchParams.set("search", params.brandName);

  const fallbackRes = await fetch(fallbackUrl.toString());
  if (!fallbackRes.ok) return normalizedProducts;
  const fallbackData = await fallbackRes.json();
  const fallbackList = Array.isArray(fallbackData) ? fallbackData : fallbackData.data || [];

  return fallbackList
    .map(normalizeProduct)
    .filter((product: Product) => matchesBrandProduct(product, params.brandName || "", params.slug));
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
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

// ── BrowsePage Component ─────────────────────────────────────────────────────
export default function BrowsePage() {
  const [location] = useLocation();
  const pageContext = useMemo(() => inferPageContext(location), [location]);
  const pageBasePath = useMemo(() => getPageContextBasePath(pageContext), [pageContext]);
  const displayBasePath = useMemo(() => getPageContextDisplayPath(pageContext), [pageContext]);
  
  const [, params] = useRoute(`${pageBasePath}/:type/:slug`);
  const type = (params?.type || "category") as "category" | "brand";
  const rawSlug = params?.slug ? decodeURIComponent(params.slug) : "";
  const slug = rawSlug.toLowerCase();

  const [sections, setSections] = useState<ApiCMSSection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const take = 24;

  // ── pageSlug for CMS sections ──────────────────────────────────────────────
  const pageSlug = useMemo(() => `${type}-${slug}`, [type, slug]);

  // ── Fetch initial data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError(null);
    setProducts([]);
    setTotalLoaded(0);
    setHasMore(true);

    // Build a display title while loading
    const displayTitle = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    setPageTitle(displayTitle);

    // Fetch CMS sections for this specific page
    const sectionsPromise = fetchPageSections(pageSlug)
      .then((secs) => (secs || []).filter((s) => s.isActive !== false))
      .catch(() => [] as ApiCMSSection[]);

    // Try to get brand details for name
    const brandNamePromise =
      type === "brand"
        ? (async () => {
            try {
              const res = await fetch(`${EFFECTIVE_API_BASE}/api/brands`);
              if (!res.ok) return null;
              const data = await res.json();
              const brands = Array.isArray(data) ? data : data.data || [];
              const match = brands.find((b: any) => (b.slug || "").toLowerCase() === slug || String(b.id) === slug);
              return match?.name || null;
            } catch {
              return null;
            }
          })()
        : Promise.resolve(null);

    // Also get category name
    const catNamePromise =
      type === "category"
        ? (async () => {
            try {
              const res = await fetch(`${EFFECTIVE_API_BASE}/api/categories`);
              if (!res.ok) return null;
              const data = await res.json();
              const cats = Array.isArray(data) ? data : data.data || [];
              const match = cats.find((c: any) => (c.slug || "").toLowerCase() === slug || String(c.id) === slug);
              return match?.name || null;
            } catch {
              return null;
            }
          })()
        : Promise.resolve(null);

    Promise.all([sectionsPromise, brandNamePromise, catNamePromise])
      .then(async ([secs, brandName, catName]) => {
        const prods = await fetchBrowseProducts({
          type,
          slug,
          take,
          skip: 0,
          brandName,
        }).catch((err) => {
          console.error("Error fetching products:", err);
          return [];
        });

        setSections(secs);
        setProducts(prods);
        setTotalLoaded(prods.length);
        setHasMore(prods.length >= take);

        if (brandName) setPageTitle(brandName);
        else if (catName) setPageTitle(catName);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load page");
      })
      .finally(() => setLoading(false));
  }, [pageSlug, type, slug, take]);

  // ── Load more products ────────────────────────────────────────────────────
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      let resolvedBrandName: string | null = null;
      if (type === "brand" && !/^\d+$/.test(slug)) {
        try {
          const res = await fetch(`${EFFECTIVE_API_BASE}/api/brands`);
          if (res.ok) {
            const data = await res.json();
            const brands = Array.isArray(data) ? data : data.data || [];
            const match = brands.find((b: any) => (b.slug || "").toLowerCase() === slug || String(b.id) === slug);
            resolvedBrandName = match?.name || null;
          }
        } catch {
          resolvedBrandName = null;
        }
      }

      const normalized = await fetchBrowseProducts({
        type,
        slug,
        take,
        skip: totalLoaded,
        brandName: resolvedBrandName,
      });

      setProducts((prev) => [...prev, ...normalized]);
      setTotalLoaded((prev) => prev + normalized.length);
      setHasMore(normalized.length >= take);
    } catch (err) {
      console.error("Error loading more products:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary pageName={`Browse: ${pageTitle}`}>
      <div className="min-h-screen bg-background">
        {/* Breadcrumb bar */}
        <div className="bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-2">
            <Link href={displayBasePath}>
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors capitalize">
                {pageContext}
              </span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <Link href="/categories">
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                {type === "category" ? "Categories" : "Brands"}
              </span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-sm font-semibold text-foreground truncate">
              {pageTitle}
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="px-4 md:px-6 py-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Link href={displayBasePath}>
                <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-black text-foreground">
                  {pageTitle}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {type === "category"
                    ? "Browse all products in this category"
                    : "Browse all products from this brand"}
                </p>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="px-4 md:px-6 py-6 space-y-6">
              {/* Skeleton sections */}
              <div className="space-y-4">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              </div>
              {/* Skeleton product grid */}
              <div className="space-y-4">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="px-4 md:px-6 py-12">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-800">
                  Error Loading Page
                </p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* CMS Sections (banners, product shelves, etc.) */}
              {sections.length > 0 && (
                <DynamicSectionRendererV2
                  sections={sections}
                  pageSlug={pageSlug}
                />
              )}

              {/* Product Grid */}
              <div className="px-4 md:px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">
                    {type === "category" ? "Products" : `All ${pageTitle}`}
                  </h2>
                  {products.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {products.length} product{products.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Package className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No products found
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type === "category"
                        ? "No products available in this category yet."
                        : "No products available from this brand yet."}
                    </p>
                    <Link href={displayBasePath}>
                      <button className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to {pageContext.charAt(0).toUpperCase() + pageContext.slice(1)}
                      </button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {products.map((product) => (
                        <UnifiedProductCard
                          key={product.id}
                          product={product}
                          className="w-full"
                        />
                      ))}
                    </div>

                    {/* Load more button */}
                    {hasMore && (
                      <div className="mt-8 text-center">
                        <button
                          onClick={loadMore}
                          disabled={loadingMore}
                          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {loadingMore ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white/90 rounded-full animate-spin" />
                              Loading...
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

              {/* Recently viewed (only if products exist) */}
              {products.length > 0 && <RecentlyViewedSection />}
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
