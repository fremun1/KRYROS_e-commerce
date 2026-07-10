import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import {
  fetchCategories,
  fetchPageSections,
  fetchSiteConfig,
} from "@/lib/api";
import type { ApiCMSSection, ApiCategory } from "@/lib/api";
import ProductSection from "@/components/home/ProductSection";

type ShopSiteConfig = {
  heroBanner?: {
    tagline?: string;
    subtitle?: string;
    bgColor?: string;
    brandColor?: string;
    ctaText?: string;
    ctaLink?: string;
    imageUrl?: string;
  };
  membersBanner?: {
    tag?: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    imageUrl?: string;
  };
};

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

// ─── Category Carousel ────────────────────────────────────────────────────────
function CategoryCarousel({ categories }: { categories: ApiCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="pt-4 pb-3">
      {/* Header */}
      <div className="px-4 md:px-6 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0" />
          <div>
            <h2 className="text-sm md:text-base font-black text-foreground tracking-tight">
              Browse Categories
            </h2>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              Tap a category to explore
            </p>
          </div>
        </div>
        <Link href="/categories">
          <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap">
            See All <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Jumia-style: horizontally scrollable portrait cards */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 md:px-6 pb-2">
        {categories.map((cat) => {
          const href = `/shop/section/${encodeURIComponent(cat.slug || cat.id)}`;
          return (
            <Link key={cat.id} href={href}>
              <a
                className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group select-none"
                style={{ width: "clamp(130px, 36vw, 160px)" }}
              >
                {/* Portrait image card */}
                <div
                  className="w-full rounded-2xl overflow-hidden bg-muted shadow-sm"
                  style={{ aspectRatio: "3/4" }}
                >
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <svg
                        className="w-10 h-10 text-primary/30"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Category name below card */}
                <span className="text-center text-xs font-semibold text-foreground leading-tight line-clamp-2 px-0.5 w-full">
                  {cat.name}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Shop Hero Banner ─────────────────────────────────────────────────────────
function ShopHero({ hero }: { hero: ShopSiteConfig["heroBanner"] }) {
  if (!hero) return null;
  const bgStyle = hero.bgColor
    ? { background: hero.bgColor }
    : { background: "linear-gradient(135deg, var(--kryros-primary) 0%, #0a7c72 100%)" };

  return (
    <section
      className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden relative"
      style={{ aspectRatio: "16/9", maxHeight: "360px" }}
    >
      {hero.imageUrl ? (
        <img
          src={hero.imageUrl}
          alt={hero.tagline || "Shop banner"}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full" style={bgStyle as any} />
      )}

      {/* Jumia-style: image-only, optional click-through */}
      {hero.ctaLink && (
        <Link href={hero.ctaLink}>
          <a className="absolute inset-0" aria-label="Open banner link" />
        </Link>
      )}
    </section>
  );
}

// ─── Members Banner ───────────────────────────────────────────────────────────
function MembersBanner({ banner }: { banner: ShopSiteConfig["membersBanner"] }) {
  if (!banner) return null;

  return (
    <section
      className="mx-4 my-4 rounded-2xl overflow-hidden relative"
      style={{ aspectRatio: "16/9", maxHeight: "300px" }}
    >
      {banner.imageUrl ? (
        <img
          src={banner.imageUrl}
          alt={banner.title || banner.tag || "Members banner"}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full"
          style={{ background: "linear-gradient(135deg, var(--kryros-primary) 0%, #0f766e 100%)" }}
        />
      )}

      {/* Jumia-style: image-only, optional click-through */}
      {banner.ctaLink && (
        <Link href={banner.ctaLink}>
          <a className="absolute inset-0" aria-label="Open banner link" />
        </Link>
      )}
    </section>
  );
}

// ─── Promo Banner ─────────────────────────────────────────────────────────────
function PromoBannerBlock({ cfg }: { cfg: Record<string, unknown> }) {
  const ctaLink = toStr(cfg.ctaLink, "/shop/section/all");
  const imageUrl = toStr(cfg.imageUrl);
  const bg = toStr(
    cfg.bgColor,
    "linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, #0d9488 100%)"
  );

  return (
    <section
      className="mx-4 my-4 rounded-2xl overflow-hidden relative"
      style={{ aspectRatio: "16/9", maxHeight: "300px" }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={toStr(cfg.title) || toStr(cfg.tag) || "Promo banner"}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full" style={{ background: bg }} />
      )}

      {/* Jumia-style: image-only, optional click-through */}
      {ctaLink && (
        <Link href={ctaLink}>
          <a className="absolute inset-0" aria-label="Open banner link" />
        </Link>
      )}
    </section>
  );
}

// ─── Flash Sale Section Wrapper (with timer badge) ────────────────────────────
function FlashSaleWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 rounded-t-none" />
      {children}
    </div>
  );
}

// ─── Section divider ─────────────────────────────────────────────────────────
function SectionDivider() {
  return <div className="h-px mx-4 bg-border/50 my-1" />;
}

// ─── ShopPage ────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const [sections, setSections] = useState<ApiCMSSection[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [siteCfg, setSiteCfg] = useState<ShopSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPageSections("shop"),
      fetchCategories(),
      fetchSiteConfig<ShopSiteConfig>("shop"),
    ])
      .then(([secs, cats, shopCfg]) => {
        setSections(
          (secs || [])
            .filter((s) => s.isActive !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        );
        setCategories((cats || []).filter((c: any) => c.isActive !== false));
        setSiteCfg(shopCfg || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pb-24 md:pb-10 max-w-7xl mx-auto">
        {/* Skeleton */}
        <div className="mx-4 mt-4 h-40 rounded-2xl bg-muted animate-pulse" />
        <div className="px-4 mt-5 mb-3 h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="flex gap-2.5 px-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mt-6">
            <div className="px-4 mb-3 h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="flex gap-2.5 px-4 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div
                  key={j}
                  className="flex-shrink-0 rounded-2xl bg-muted animate-pulse"
                  style={{ width: 148, height: 220 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-lg font-black text-foreground">Shop is not configured yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Go to Admin Panel → CMS Pages → Shop → Reset sections to defaults.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-10 max-w-7xl mx-auto">
      {sections.map((sec, idx) => {
        const cfg = (sec.config ?? {}) as Record<string, unknown>;
        const isFirst = idx === 0;

        // ── Shop Hero
        if (sec.type === "ShopHero") {
          const fromSite = siteCfg?.heroBanner;
          const hero = fromSite || {
            tagline: toStr(cfg.tagline || cfg.title, "Shop the Best Deals"),
            subtitle: toStr(cfg.subtitle, "Discover products section by section"),
            bgColor: toStr(cfg.bgColor),
            brandColor: toStr(cfg.brandColor),
            ctaText: toStr(cfg.ctaText),
            ctaLink: toStr(cfg.ctaLink),
            imageUrl: toStr(cfg.imageUrl),
          };
          return <ShopHero key={sec.id} hero={hero} />;
        }

        // ── Category row
        if (sec.type === "ShopCategories") {
          return (
            <div key={sec.id}>
              {!isFirst && <SectionDivider />}
              <CategoryCarousel categories={categories} />
            </div>
          );
        }

        // ── Promo banner
        if (sec.type === "ShopPromoBanner") {
          return <PromoBannerBlock key={sec.id} cfg={cfg} />;
        }

        // ── Members banner
        if (sec.type === "MembersBanner") {
          return <MembersBanner key={sec.id} banner={siteCfg?.membersBanner} />;
        }

        // ── Product shelf (main section type)
        if (sec.type === "ShopProductShelf") {
          const sectionSlug = toStr(cfg.sectionSlug);
          const title = toStr(cfg.title, sec.title || "Products");
          const subtitle = toStr(cfg.subtitle);
          const viewAllHref =
            toStr(cfg.ctaLink) ||
            (sectionSlug
              ? `/shop/section/${encodeURIComponent(sectionSlug)}`
              : "/shop/section/all");
          const limit = toNum(cfg.limit, 10);
          const isFlashSale = cfg.isFlashSale !== undefined && toBool(cfg.isFlashSale);

          const params: any = {};
          const categorySlug = toStr(cfg.categorySlug);
          const popularity = toStr(cfg.popularity);
          if (categorySlug) params.categorySlug = categorySlug;
          if (popularity) params.popularity = popularity;
          if (cfg.isFlashSale !== undefined) params.isFlashSale = toBool(cfg.isFlashSale);
          if (cfg.featured !== undefined) params.featured = toBool(cfg.featured);

          const accentColor = isFlashSale ? "#ef4444" : undefined;

          const section = (
            <div key={sec.id}>
              <SectionDivider />
              <ProductSection
                title={title}
                subtitle={subtitle || undefined}
                viewAllHref={viewAllHref}
                params={params}
                limit={limit}
                accentColor={accentColor}
              />
            </div>
          );

          return isFlashSale ? (
            <FlashSaleWrapper key={sec.id}>{section}</FlashSaleWrapper>
          ) : (
            section
          );
        }

        return null;
      })}
    </div>
  );
}
