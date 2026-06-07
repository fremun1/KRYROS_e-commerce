import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Heart, ShoppingCart, Star, ChevronRight, Zap, Headphones, X, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { fetchProducts, fetchCategories, fetchBrands, fetchAllBrandBanners, API_BASE } from "@/lib/api";
import type { Product, ApiCategory, ApiBrand, ApiBrandBanner } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** Convert brand name to a safe anchor slug */
function toAnchor(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ShopPage() {
  const [selectedCat, setSelectedCat] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [heroDot, setHeroDot] = useState(0);
  const [brandBanners, setBrandBanners] = useState<Record<string, ApiBrandBanner>>({});
  const [membersBanner, setMembersBanner] = useState<{tag?: string; title?: string; subtitle?: string; ctaText?: string; ctaLink?: string; imageUrl?: string} | null>(null);
  const [shopHeroBanner, setShopHeroBanner] = useState<{tagline?: string; subtitle?: string; bgColor?: string; brandColor?: string; ctaText?: string; ctaLink?: string; imageUrl?: string} | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Category auto-scroll refs
  const catScrollRef = useRef<HTMLDivElement>(null);
  const catDirRef = useRef<1 | -1>(1);
  const catAnimRef = useRef<number>(0);
  const catPausedRef = useRef(false);
  const catLastTimeRef = useRef(0);

  // Brand panel state
  const [activeBrandPanel, setActiveBrandPanel] = useState<string | null>(null);
  const [brandPanelCat, setBrandPanelCat] = useState<string>("All");

  // Read search query from URL (?search=...)
  const searchParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("search") || ""
    : "";

  useEffect(() => {
    fetchCategories().then((cats) => {
      setCategories(cats.filter((c: any) => c.isActive !== false));
    });
    fetchBrands().then((bs) => {
      setBrands(bs);
      if (bs.length > 0) setSelectedBrand(bs[0].name);
    });
    const searchQ = new URLSearchParams(window.location.search).get("search") || "";
    fetchProducts({ take: 50, search: searchQ || undefined }).then(setAllProducts);
    fetchAllBrandBanners().then((banners) => {
      const bySlug: Record<string, ApiBrandBanner> = {};
      banners.forEach((b) => { bySlug[b.brandSlug] = b; });
      setBrandBanners(bySlug);
    });
    fetch(`${API_BASE}/api/cms/site-config/shop`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.value?.membersBanner) setMembersBanner(d.value.membersBanner);
        if (d?.value?.heroBanner) setShopHeroBanner(d.value.heroBanner);
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/cms/site-config/shop-brand-banners`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (Array.isArray(d?.value)) {
          const fromConfig: Record<string, ApiBrandBanner> = {};
          (d.value as any[]).forEach((b: any) => {
            const slug = (b.slug || b.brandSlug || '').toLowerCase();
            if (slug) fromConfig[slug] = { id: b.id || slug, brandSlug: slug, brandName: b.name || b.brandName || slug, tagline: b.tagline, description: b.description, bgColor: b.bgColor, bgGradient: b.bgGradient, ctaText: b.ctaText, ctaLink: b.buttonLink || b.ctaLink, imageUrl: b.imageUrl || '' };
          });
          setBrandBanners(prev => ({ ...fromConfig, ...prev }));
        }
      })
      .catch(() => {});
  }, []);

  // Reset panel category filter when brand changes
  useEffect(() => {
    setBrandPanelCat("All");
  }, [activeBrandPanel]);

  // Auto-scroll categories left ↔ right (ping-pong)
  useEffect(() => {
    const el = catScrollRef.current;
    if (!el || categories.length === 0) return;

    const SPEED = 0.03; // px per ms — very slow, gentle drift

    const tick = (time: number) => {
      if (catPausedRef.current) {
        catAnimRef.current = requestAnimationFrame(tick);
        return;
      }
      if (catLastTimeRef.current === 0) catLastTimeRef.current = time;
      const delta = Math.min(time - catLastTimeRef.current, 50);
      catLastTimeRef.current = time;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        if (el.scrollLeft >= maxScroll - 1) catDirRef.current = -1;
        if (el.scrollLeft <= 1) catDirRef.current = 1;
        el.scrollLeft += catDirRef.current * SPEED * delta;
      }
      catAnimRef.current = requestAnimationFrame(tick);
    };

    catAnimRef.current = requestAnimationFrame(tick);

    const pause = () => { catPausedRef.current = true; };
    const resume = () => { catPausedRef.current = false; catLastTimeRef.current = 0; };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);

    return () => {
      cancelAnimationFrame(catAnimRef.current);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [categories]);

  const brandSlug = selectedBrand ? selectedBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
  const cmsBanner = brandSlug ? brandBanners[brandSlug] : undefined;
  const hero = cmsBanner && (cmsBanner.tagline || cmsBanner.description || cmsBanner.bgColor || cmsBanner.imageUrl) ? { pre: cmsBanner.tagline || '', brand: cmsBanner.brandName ? cmsBanner.brandName + '.' : '', sub: cmsBanner.description || '', bg: cmsBanner.bgColor || '#f5f5f5', brandColor: cmsBanner.bgGradient || 'var(--kryros-primary)', ctaText: cmsBanner.ctaText, ctaLink: cmsBanner.ctaLink, imageUrl: cmsBanner.imageUrl || '' } : null;

  // Brand panel promotional banner — purely dynamic, no fallback
  // Slugs stored in CMS may have a leading "/" (e.g. "/samsung") — normalise before matching
  const panelSlug = activeBrandPanel
    ? activeBrandPanel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : '';
  const panelCmsBanner = panelSlug
    ? (brandBanners[panelSlug]
       || brandBanners['/' + panelSlug]
       || Object.values(brandBanners).find(
           (b) => (b.brandSlug || '').replace(/^\//, '').toLowerCase() === panelSlug
         )
      )
    : undefined;
  // Only build panelHero when real CMS data exists — no hardcoded defaults
  const panelHero = panelCmsBanner
    ? {
        pre: panelCmsBanner.tagline || '',
        brand: panelCmsBanner.brandName || '',
        sub: panelCmsBanner.description || '',
        bg: panelCmsBanner.bgColor || panelCmsBanner.bgGradient || '#f5f5f5',
        brandColor: panelCmsBanner.bgGradient || panelCmsBanner.bgColor || 'var(--kryros-primary)',
        ctaText: panelCmsBanner.ctaText,
        ctaLink: panelCmsBanner.ctaLink,
        imageUrl: panelCmsBanner.imageUrl || '',
        hasImage: !!(panelCmsBanner.imageUrl),
      }
    : null;

  const filteredProducts = selectedCat === "All"
    ? allProducts
    : allProducts.filter((p) => p.category === selectedCat || p.categoryId === selectedCat);

  // Client-side search filter for search results
  const searchResults = searchParam
    ? allProducts.filter((p) =>
        p.name?.toLowerCase().includes(searchParam.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchParam.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchParam.toLowerCase()) ||
        p.specs?.toLowerCase().includes(searchParam.toLowerCase())
      )
    : [];

  const uniqueBrands = Array.from(new Set(allProducts.map((p) => p.brand).filter(Boolean)));

  // Brand panel: products for active brand, optionally filtered by category
  const brandPanelProducts = activeBrandPanel
    ? allProducts.filter((p) => p.brand === activeBrandPanel)
    : [];
  const brandPanelFiltered = brandPanelCat === "All"
    ? brandPanelProducts
    : brandPanelProducts.filter((p) => p.category === brandPanelCat || p.categoryId === brandPanelCat);

  // Categories that exist for the active brand (for filtering inside panel)
  const brandCategories = activeBrandPanel
    ? categories.filter((cat) =>
        brandPanelProducts.some((p) => p.category === cat.name || p.categoryId === cat.id)
      )
    : [];

  const openBrandPanel = (brandName: string) => {
    setSelectedBrand(brandName);
    setHeroDot(0);
    setActiveBrandPanel(brandName);
  };

  const closeBrandPanel = () => {
    setActiveBrandPanel(null);
    setBrandPanelCat("All");
  };

  return (
    <div className="pb-24 md:pb-10">

      {/* ── Brand Panel (Bottom Sheet) ── */}
      <Sheet open={!!activeBrandPanel} onOpenChange={(open) => { if (!open) closeBrandPanel(); }}>
        <SheetContent
          side="bottom"
          className="h-[88vh] rounded-t-3xl px-0 pb-0 flex flex-col"
        >
          {/* Panel Header */}
          <SheetHeader className="px-4 pt-2 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Shop by Brand
                </p>
                <SheetTitle className="text-lg font-black text-foreground leading-tight mt-0.5">
                  {activeBrandPanel}
                </SheetTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {brandPanelProducts.length} product{brandPanelProducts.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View All button resets to full shop */}
                <button
                  onClick={closeBrandPanel}
                  className="flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-full border border-teal-200 dark:border-teal-800"
                >
                  All Products
                </button>
                <button
                  onClick={closeBrandPanel}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>

            {/* Category filter inside panel */}
            {brandCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3 pb-1">
                <button
                  onClick={() => setBrandPanelCat("All")}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    brandPanelCat === "All"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border text-foreground hover:border-teal-600/50"
                  }`}
                >
                  All
                </button>
                {brandCategories.map((cat) => {
                  const active = brandPanelCat === cat.name || brandPanelCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setBrandPanelCat(cat.name)}
                      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-border text-foreground hover:border-teal-600/50"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </SheetHeader>

          {/* Brand Promotional Banner inside panel */}
          {panelHero && (
            <div className="mx-3 mt-3 mb-1 rounded-2xl overflow-hidden flex-shrink-0">
              {panelHero.hasImage ? (
                /* Image banner — fixed compact height, text overlaid cleanly */
                <div className="relative h-[130px]">
                  <img
                    src={panelHero.imageUrl}
                    alt={panelHero.brand}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)' }} />
                  {/* Text on top */}
                  <div className="absolute inset-0 flex flex-col justify-end p-3 z-10">
                    {panelHero.pre && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">
                        {panelHero.pre}
                      </p>
                    )}
                    <h2 className="text-base font-black leading-tight text-white">
                      {panelHero.brand}
                    </h2>
                    {panelHero.sub && (
                      <p className="text-[10px] text-white/80 leading-snug mt-0.5 line-clamp-1">
                        {panelHero.sub}
                      </p>
                    )}
                    {panelHero.ctaLink && (
                      <div className="mt-2">
                        <Link href={panelHero.ctaLink}>
                          <button className="inline-flex items-center gap-1 bg-white text-teal-700 text-[11px] font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity">
                            {panelHero.ctaText || `Shop ${activeBrandPanel}`}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Color-only banner (no image) */
                <div
                  className="flex flex-col justify-center px-4 py-3 min-h-[72px]"
                  style={{ background: panelHero.bg }}
                >
                  {panelHero.pre && (
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                      style={{ color: '#9ca3af' }}>
                      {panelHero.pre}
                    </p>
                  )}
                  <h2 className="text-base font-black leading-tight"
                    style={{ color: panelHero.brandColor }}>
                    {panelHero.brand}
                  </h2>
                  {panelHero.sub && (
                    <p className="text-[11px] mt-0.5 leading-relaxed line-clamp-1"
                      style={{ color: '#6b7280' }}>
                      {panelHero.sub}
                    </p>
                  )}
                  {panelHero.ctaLink && (
                    <div className="mt-2">
                      <Link href={panelHero.ctaLink}>
                        <button className="inline-flex items-center gap-1 bg-foreground text-background text-[11px] font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity">
                          {panelHero.ctaText || `Shop ${activeBrandPanel}`}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Panel Product Grid (scrollable) */}
          <div className="flex-1 overflow-y-auto px-3 pt-3 pb-8">
            {brandPanelFiltered.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {brandPanelFiltered.map((p) => (
                  <UnifiedProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm font-semibold">No products found</p>
                <p className="text-xs mt-1">Try a different category</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Search Results Section ── */}
      {searchParam && (
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-black text-foreground">
                Results for &ldquo;{searchParam}&rdquo;
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {searchResults.length} product{searchResults.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <a href="/shop" className="text-xs text-primary font-semibold hover:underline">Clear ✕</a>
          </div>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {searchResults.map((p) => <UnifiedProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-semibold">No products found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* ── Normal Shop (hidden when search active) ── */}
      {!searchParam && (
      <>
      {/* ── General Shop Hero Banner (CMS-managed, only shown when configured) ── */}
      {shopHeroBanner && (
      <div className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden" style={shopHeroBanner.imageUrl ? { backgroundImage: `url(${shopHeroBanner.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: shopHeroBanner.bgColor || "linear-gradient(135deg, var(--kryros-primary) 0%, #0a7c72 100%)" }}>
        <div className="flex items-center min-h-[120px] relative overflow-hidden p-4">
          <div className="flex-1 z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white/70">KRYROS Store</p>
            {shopHeroBanner.tagline && <h2 className="text-xl font-black leading-tight mb-1 text-white">{shopHeroBanner.tagline}</h2>}
            {shopHeroBanner.subtitle && <p className="text-[11px] mb-3 leading-relaxed text-white/80">{shopHeroBanner.subtitle}</p>}
            {shopHeroBanner.ctaLink && (
              <Link href={shopHeroBanner.ctaLink}>
                <button className="flex items-center gap-1.5 bg-white text-teal-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-opacity">
                  {shopHeroBanner.ctaText || "Explore Now"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            )}
          </div>
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center ml-3">
            <Zap className="w-8 h-8 text-white/80" />
          </div>
        </div>
      </div>
      )}
      <div className="text-center pt-2 pb-3 px-4">
        <h2 className="text-base font-black text-foreground tracking-tight">Shop All Products</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Browse our full collection by category</p>
      </div>

      {/* Category cards */}
      {categories.length > 0 && (
        <div ref={catScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-4">
          <button
            onClick={() => setSelectedCat("All")}
            className={`flex-shrink-0 snap-start relative w-36 h-36 rounded-2xl overflow-hidden transition-all bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center ${selectedCat === "All" ? "ring-2 ring-teal-500 ring-offset-2" : ""}`}
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,20,30,0.92) 0%, rgba(10,20,30,0.55) 55%, rgba(10,20,30,0.15) 100%)" }} />
            <div className="absolute bottom-0 left-0 right-0 p-2.5">
              <p className="text-white font-black text-xs uppercase tracking-wide leading-tight mb-1">All</p>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-0.5 bg-teal-400 rounded-full" />
                <span className="text-white/70 text-[10px] font-medium">{allProducts.length} ITEMS</span>
              </div>
            </div>
          </button>

          {categories.map((cat) => {
            const active = selectedCat === cat.name || selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.name)}
                className={`flex-shrink-0 snap-start relative w-36 h-36 rounded-2xl overflow-hidden transition-all ${active ? "ring-2 ring-teal-500 ring-offset-2" : ""}`}
              >
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,20,30,0.92) 0%, rgba(10,20,30,0.55) 55%, rgba(10,20,30,0.15) 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white font-black text-xs uppercase tracking-wide leading-tight mb-1">{cat.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-0.5 bg-teal-400 rounded-full" />
                    <span className="text-white/70 text-[10px] font-medium">{cat._count?.products ?? 0} ITEMS</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mx-4 mb-4 border-t border-border" />

      {/* Hero banner for selected brand */}
      {hero && (
        <div className="mx-4 mb-5 rounded-2xl overflow-hidden" style={cmsBanner?.imageUrl ? { backgroundImage: `url(${cmsBanner.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: hero.bg }}>
          <div className="flex items-center min-h-[140px] relative overflow-hidden p-4">
            <div className="flex-1 z-10">
              <p className="text-xs text-gray-600 font-medium">{hero.pre}</p>
              <h2 className="text-2xl font-black leading-tight mb-1" style={{ color: hero.brandColor }}>{hero.brand}</h2>
              <p className="text-[11px] text-gray-600 mb-3 leading-relaxed whitespace-pre-line">{hero.sub}</p>
              <button
                onClick={() => openBrandPanel(selectedBrand)}
                className="flex items-center gap-1.5 bg-foreground text-background text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Shop {selectedBrand} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex justify-center gap-1.5 pb-3">
            {[0, 1, 2, 3].map((i) => (
              <button key={i} onClick={() => setHeroDot(i)} className={`rounded-full transition-all ${heroDot === i ? "w-4 h-1.5 bg-teal-600" : "w-1.5 h-1.5 bg-gray-300"}`} />
            ))}
          </div>
        </div>
      )}

      <div className="mx-4 mb-4 border-t border-border" />

      {/* Shop by Brand — tap a brand to open its panel */}
      {uniqueBrands.length > 0 && (
        <div className="px-4 mb-5">
          <p className="text-sm font-bold text-foreground mb-2.5">Shop by Brand</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {uniqueBrands.slice(0, 8).map((name) => {
              const active = selectedBrand === name;
              return (
                <button
                  key={name}
                  onClick={() => openBrandPanel(name!)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all ${active ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground hover:border-teal-600/50"}`}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <ChevronDown className="w-3 h-3" /> Tap a brand to browse its products
          </p>
        </div>
      )}

      <div className="mx-4 mb-4 border-t border-border" />

      {/* Products grid */}
      {filteredProducts.length > 0 ? (
        <div className="px-3 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-foreground">
              {selectedCat === "All" ? "All Products" : selectedCat}
            </h2>
            <span className="text-xs text-muted-foreground">{filteredProducts.length} items</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pb-4">
            {filteredProducts.map((p) => <UnifiedProductCard key={p.id} product={p} />)}
          </div>
        </div>
      ) : (
        allProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading products...</div>
        )
      )}

      {/* Members Banner — only shown when configured in admin panel */}
      {membersBanner && (
      <div className="mx-4 mb-5 rounded-2xl overflow-hidden" style={membersBanner.imageUrl ? { backgroundImage: `url(${membersBanner.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: "linear-gradient(135deg, var(--kryros-primary) 0%, #0f766e 100%)" }}>
        <div className="flex items-center p-4 gap-3">
          <div className="flex-1">
            {membersBanner.tag && <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">{membersBanner.tag}</p>}
            {membersBanner.title && <h3 className="text-xl font-black text-white leading-tight">{membersBanner.title}</h3>}
            {membersBanner.subtitle && <p className="text-[11px] text-white/80 mb-3">{membersBanner.subtitle}</p>}
            {membersBanner.ctaLink && (
              <Link href={membersBanner.ctaLink}>
                <button className="flex items-center gap-1.5 bg-white text-teal-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-opacity">
                  {membersBanner.ctaText || "Join Now"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            )}
          </div>
          <div className="flex-shrink-0 flex flex-col items-center gap-1 text-right">
            <div className="bg-white/15 rounded-xl p-2 mb-1">
              <Headphones className="w-8 h-8 text-white" />
            </div>
            <p className="text-[9px] font-bold text-white/80 text-center">Members Only</p>
            <p className="text-[9px] text-white/60 text-center">Exclusive Deals</p>
            <p className="text-[10px] font-black text-white">KRY<span className="text-teal-200">ROS</span></p>
          </div>
        </div>
      </div>
      )}
      </>
      )}
    </div>
  );
}
