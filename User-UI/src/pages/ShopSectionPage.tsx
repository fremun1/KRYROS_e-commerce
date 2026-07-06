import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ChevronLeft } from "lucide-react";
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
    // 1) explicit CMS shelf slug
    const matchByCfg = sections.find((s) => {
      const cfg = (s.config ?? {}) as Record<string, unknown>;
      return toStr(cfg.sectionSlug).toLowerCase() === slug.toLowerCase();
    });
    if (matchByCfg) return { kind: "cms" as const, section: matchByCfg };

    // 2) category slug
    const matchCat = categories.find((c) => (c.slug || c.id).toLowerCase() === slug.toLowerCase());
    if (matchCat) return { kind: "category" as const, category: matchCat };

    // 3) fallback all
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
      // Always exclude wholesale-only products by default (client api.ts already does)
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

  const canLoadMore = useMemo(() => {
    // We don't have server total in this page without changing fetchProducts typing,
    // so we just keep loading until the API returns < take items.
    return products.length === totalLoaded;
  }, [products.length, totalLoaded]);

  const load = async (nextSkip: number, append: boolean) => {
    const result = await fetchProducts({ ...buildQuery, take, skip: nextSkip });
    setTotalLoaded(result.length);
    setProducts((prev) => (append ? prev.concat(result) : result));
  };

  useEffect(() => {
    // Reset paging when slug changes
    setSkip(0);
    setProducts([]);
    setTotalLoaded(0);
    if (!loading) {
      load(0, false);
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

  const showLoadMore = useMemo(() => {
    // If the last request returned less than take, no more data
    return totalLoaded === take;
  }, [totalLoaded, take]);

  return (
    <div className="pb-24 md:pb-10 max-w-7xl mx-auto px-3 md:px-6 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/shop">
          <a className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <ChevronLeft className="w-4 h-4" />
            Back to shop
          </a>
        </Link>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-foreground">{pageTitle}</h1>
          {resolved.kind === "cms" && (
            <p className="text-xs text-muted-foreground mt-1">
              Browsing a curated section
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-sm text-muted-foreground">Loading…</div>
      ) : products.length === 0 ? (
        <div className="py-10 text-sm text-muted-foreground">No products found.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-4">
            {products.map((p) => (
              <UnifiedProductCard key={p.id} product={p} className="w-full" />
            ))}
          </div>

          {showLoadMore && (
            <div className="flex justify-center pb-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

