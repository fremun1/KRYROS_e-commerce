import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Zap } from "lucide-react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const allCards = useMemo(
    () => [{ id: "__all__", name: "All", slug: "" } as any].concat(categories),
    [categories]
  );

  const scrollTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstCard = el.children[0] as HTMLElement | undefined;
    const itemWidth = firstCard ? firstCard.offsetWidth + 10 : 108;
    el.scrollTo({ left: index * itemWidth, behavior: "smooth" });
  };

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
        <Link href="/shop/section/all">
          <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap">
            All <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Horizontal cards */}
      <div
        ref={scrollerRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 md:px-6 pb-2"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          const firstCard = el.children[0] as HTMLElement | undefined;
          const itemWidth = firstCard ? firstCard.offsetWidth + 10 : 108;
          const idx = Math.round(el.scrollLeft / itemWidth);
          setActive(Math.max(0, Math.min(idx, allCards.length - 1)));
        }}
      >
        {allCards.map((cat: ApiCategory, idx: number) => {
          const href =
            idx === 0
              ? "/shop/section/all"
              : `/shop/section/${encodeURIComponent(cat.slug || cat.id)}`;
          const isActive = active === idx;
          return (
            <Link key={cat.id} href={href}>
              <a
                className="flex-shrink-0 snap-start flex flex-col items-center gap-1.5 cursor-pointer group"
                style={{ width: "clamp(80px, 22vw, 110px)" }}
              >
                {/* Image circle */}
                <div
                  className={`relative w-full overflow-hidden rounded-2xl border-2 transition-all ${
                    isActive
                      ? "border-primary shadow-md shadow-primary/20"
                      : "border-border group-hover:border-primary/40"
                  }`}
                  style={{ aspectRatio: "1" }}
                >
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <span className="text-2xl md:text-3xl">🛍️</span>
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)",
                    }}
                  />
                </div>
                {/* Label below image */}
                <p
                  className={`text-[10px] md:text-xs font-bold text-center leading-tight px-0.5 truncate w-full transition-colors ${
                    isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {cat.name}
                </p>
              </a>
            </Link>
          );
        })}
      </div>

      {/* Dot indicators (mobile only) */}
      <div className="flex justify-center gap-1.5 pt-2 md:hidden">
        {allCards.slice(0, Math.min(allCards.length, 10)).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`rounded-full transition-all ${
              active === i ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Shop Hero Banner ─────────────────────────────────────────────────────────
function ShopHero({ hero }: { hero: ShopSiteConfig["heroBanner"] }) {
  if (!hero) return null;
  const style = hero.imageUrl
    ? {
        backgroundImage: `url(${hero.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background:
          hero.bgColor ||
          "linear-gradient(135deg, var(--kryros-primary) 0%, #0a7c72 100%)",
      };

  return (
    <section className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden" style={style as any}>
      <div className="flex items-center min-h-[160px] relative overflow-hidden p-4 sm:min-h-[200px] lg:min-h-[240px] lg:p-10">
        {hero.imageUrl && (
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 60%, transparent 100%)",
            }}
          />
        )}
        <div className="flex-1 z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white/70">
            KRYROS Store
          </p>
          {hero.tagline && (
            <h1 className="text-xl font-black leading-tight mb-1 text-white lg:text-4xl lg:mb-3">
              {hero.tagline}
            </h1>
          )}
          {hero.subtitle && (
            <p className="text-[11px] mb-3 leading-relaxed text-white/80 lg:text-base lg:mb-5">
              {hero.subtitle}
            </p>
          )}
          {hero.ctaLink && (
            <Link href={hero.ctaLink}>
              <button className="flex items-center gap-1.5 bg-white text-teal-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-opacity lg:px-6 lg:py-3 lg:text-sm">
                {hero.ctaText || "Explore Now"} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Members Banner ───────────────────────────────────────────────────────────
function MembersBanner({ banner }: { banner: ShopSiteConfig["membersBanner"] }) {
  if (!banner) return null;

  return (
    <section
      className="mx-4 my-4 rounded-2xl overflow-hidden"
      style={
        banner.imageUrl
          ? {
              backgroundImage: `url(${banner.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { background: "linear-gradient(135deg, var(--kryros-primary) 0%, #0f766e 100%)" }
      }
    >
      <div className="flex items-center p-4 gap-3">
        <div className="flex-1">
          {banner.tag && (
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">
              {banner.tag}
            </p>
          )}
          {banner.title && (
            <h3 className="text-xl font-black text-white leading-tight lg:text-3xl">
              {banner.title}
            </h3>
          )}
          {banner.subtitle && (
            <p className="text-[11px] text-white/80 mb-3 lg:text-sm lg:mb-5">{banner.subtitle}</p>
          )}
          {banner.ctaLink && (
            <Link href={banner.ctaLink}>
              <button className="flex items-center gap-1.5 bg-white text-teal-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-opacity">
                {banner.ctaText || "Join Now"} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Promo Banner ─────────────────────────────────────────────────────────────
function PromoBannerBlock({ cfg }: { cfg: Record<string, unknown> }) {
  const tag = toStr(cfg.tag);
  const title = toStr(cfg.title);
  const subtitle = toStr(cfg.subtitle);
  const ctaText = toStr(cfg.ctaText, "Shop Now");
  const ctaLink = toStr(cfg.ctaLink, "/shop/section/all");
  const imageUrl = toStr(cfg.imageUrl);
  const bg = toStr(
    cfg.bgColor,
    "linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, #0d9488 100%)"
  );

  return (
    <section
      className="mx-4 my-4 rounded-2xl overflow-hidden"
      style={
        imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { background: bg }
      }
    >
      <div className="relative p-4 sm:p-6">
        {imageUrl && (
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
        )}
        <div className="relative">
          {tag && (
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{tag}</p>
          )}
          {title && <h3 className="text-xl font-black text-white mt-1">{title}</h3>}
          {subtitle && (
            <p className="text-[11px] text-white/80 mt-1 max-w-xl">{subtitle}</p>
          )}
          <div className="mt-3">
            <Link href={ctaLink}>
              <button className="inline-flex items-center gap-1.5 bg-white text-teal-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-opacity">
                {ctaText} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
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
