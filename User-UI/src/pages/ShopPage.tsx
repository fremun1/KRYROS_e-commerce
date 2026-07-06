import { useEffect, useMemo, useRef, useState } from "react";
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

function CategoryCarousel({ categories }: { categories: ApiCategory[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const allCards = useMemo(() => [{ id: "__all__", name: "All", slug: "" } as any].concat(categories), [categories]);

  const scrollTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstCard = el.children[0] as HTMLElement | undefined;
    const itemWidth = firstCard ? firstCard.offsetWidth + 12 : 156;
    el.scrollTo({ left: index * itemWidth, behavior: "smooth" });
  };

  return (
    <section className="pt-4 pb-2">
      <div className="px-4 mb-2 flex items-end justify-between">
        <div>
          <h2 className="text-base font-black text-foreground lg:text-xl">Browse Categories</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 lg:text-sm">Pick a category to explore</p>
        </div>
        <Link href="/shop/section/all">
          <span className="text-xs text-primary font-semibold cursor-pointer hover:underline flex items-center gap-0.5 whitespace-nowrap">
            All products <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-3"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          const firstCard = el.children[0] as HTMLElement | undefined;
          const itemWidth = firstCard ? firstCard.offsetWidth + 12 : 156;
          const idx = Math.round(el.scrollLeft / itemWidth);
          setActive(Math.max(0, Math.min(idx, allCards.length - 1)));
        }}
      >
        {allCards.map((cat: ApiCategory, idx: number) => {
          const href = idx === 0 ? "/shop/section/all" : `/shop/section/${encodeURIComponent(cat.slug || cat.id)}`;
          return (
            <Link key={cat.id} href={href}>
              <a className="flex-shrink-0 snap-start relative w-36 h-36 rounded-2xl overflow-hidden transition-all md:w-44 md:h-44 lg:w-52 lg:h-52 lg:rounded-3xl">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(10,20,30,0.92) 0%, rgba(10,20,30,0.55) 55%, rgba(10,20,30,0.15) 100%)" }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white font-black text-xs uppercase tracking-wide leading-tight mb-1">
                    {cat.name}
                  </p>
                  <div className="w-5 h-0.5 bg-teal-400 rounded-full" />
                </div>
              </a>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center gap-1.5 pb-2 -mt-1 md:hidden">
        {allCards.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`rounded-full transition-all ${active === i ? "w-4 h-1.5 bg-teal-600" : "w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600"}`}
          />
        ))}
      </div>
    </section>
  );
}

function ShopHero({ hero }: { hero: ShopSiteConfig["heroBanner"] }) {
  if (!hero) return null;
  const style = hero.imageUrl
    ? { backgroundImage: `url(${hero.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: hero.bgColor || "linear-gradient(135deg, var(--kryros-primary) 0%, #0a7c72 100%)" };

  return (
    <section className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden" style={style as any}>
      <div className="flex items-center min-h-[180px] relative overflow-hidden p-4 sm:min-h-[210px] lg:min-h-[260px] lg:p-10">
        {hero.imageUrl && (
          <div
            className="absolute inset-0 z-0"
            style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 60%, transparent 100%)" }}
          />
        )}
        <div className="flex-1 z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white/70">KRYROS Store</p>
          {hero.tagline && <h1 className="text-xl font-black leading-tight mb-1 text-white lg:text-4xl lg:mb-3">{hero.tagline}</h1>}
          {hero.subtitle && <p className="text-[11px] mb-3 leading-relaxed text-white/80 lg:text-base lg:mb-5">{hero.subtitle}</p>}
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

function MembersBanner({ banner }: { banner: ShopSiteConfig["membersBanner"] }) {
  if (!banner) return null;

  return (
    <section
      className="mx-4 my-6 rounded-2xl overflow-hidden"
      style={
        banner.imageUrl
          ? { backgroundImage: `url(${banner.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "linear-gradient(135deg, var(--kryros-primary) 0%, #0f766e 100%)" }
      }
    >
      <div className="flex items-center p-4 gap-3">
        <div className="flex-1">
          {banner.tag && (
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">{banner.tag}</p>
          )}
          {banner.title && <h3 className="text-xl font-black text-white leading-tight lg:text-3xl">{banner.title}</h3>}
          {banner.subtitle && <p className="text-[11px] text-white/80 mb-3 lg:text-sm lg:mb-5">{banner.subtitle}</p>}
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

function PromoBannerBlock({ cfg }: { cfg: Record<string, unknown> }) {
  const tag = toStr(cfg.tag);
  const title = toStr(cfg.title);
  const subtitle = toStr(cfg.subtitle);
  const ctaText = toStr(cfg.ctaText, "Shop Now");
  const ctaLink = toStr(cfg.ctaLink, "/shop/section/all");
  const imageUrl = toStr(cfg.imageUrl);
  const bg = toStr(cfg.bgColor, "linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, #0d9488 100%)");

  return (
    <section className="mx-4 my-6 rounded-2xl overflow-hidden" style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: bg }}>
      <div className="relative p-4 sm:p-6">
        {imageUrl && <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />}
        <div className="relative">
          {tag && <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{tag}</p>}
          {title && <h3 className="text-xl font-black text-white mt-1">{title}</h3>}
          {subtitle && <p className="text-[11px] text-white/80 mt-1 max-w-xl">{subtitle}</p>}
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
        setSections((secs || []).filter((s) => s.isActive !== false).sort((a, b) => (a.order || 0) - (b.order || 0)));
        setCategories((cats || []).filter((c: any) => c.isActive !== false));
        setSiteCfg(shopCfg || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && sections.length === 0) {
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
      {sections.map((sec) => {
        const cfg = (sec.config ?? {}) as Record<string, unknown>;

        // Shop hero: by default uses site-config "shop.heroBanner"
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

        // Categories row
        if (sec.type === "ShopCategories") {
          return <CategoryCarousel key={sec.id} categories={categories} />;
        }

        // Promo banner
        if (sec.type === "ShopPromoBanner") {
          return <PromoBannerBlock key={sec.id} cfg={cfg} />;
        }

        // Members banner: uses site-config "shop.membersBanner"
        if (sec.type === "MembersBanner") {
          return <MembersBanner key={sec.id} banner={siteCfg?.membersBanner} />;
        }

        // Product shelf
        if (sec.type === "ShopProductShelf") {
          const sectionSlug = toStr(cfg.sectionSlug);
          const title = toStr(cfg.title, sec.title || "Products");
          const viewAllHref = toStr(cfg.ctaLink) || (sectionSlug ? `/shop/section/${encodeURIComponent(sectionSlug)}` : "/shop/section/all");
          const limit = toNum(cfg.limit, 10);
          const scroll = toBool(cfg.scroll, true);

          const params: any = {};
          const categorySlug = toStr(cfg.categorySlug);
          const popularity = toStr(cfg.popularity);
          const isFlashSale = cfg.isFlashSale;
          const featured = cfg.featured;

          if (categorySlug) params.categorySlug = categorySlug;
          if (popularity) params.popularity = popularity;
          if (isFlashSale !== undefined) params.isFlashSale = toBool(isFlashSale);
          if (featured !== undefined) params.featured = toBool(featured);

          return (
            <div key={sec.id}>
              <ProductSection
                title={title}
                viewAllHref={viewAllHref}
                params={params}
                limit={limit}
                scroll={scroll}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

