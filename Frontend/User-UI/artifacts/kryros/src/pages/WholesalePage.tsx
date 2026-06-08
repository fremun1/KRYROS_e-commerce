import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Tag, Truck, ShieldCheck, Headphones, ShoppingCart, ChevronRight, Heart, LayoutGrid, Search, ClipboardList, SendHorizonal, CheckCircle2 } from "lucide-react";
import { fetchProducts, fetchCategories, API_BASE } from "@/lib/api";
import type { Product, ApiCategory } from "@/lib/api";
import { useCurrencyStore } from "@/store/currencyStore";
import UnifiedProductCard from "@/components/UnifiedProductCard";

const STEP_ICONS = [Search, ClipboardList, SendHorizonal, CheckCircle2];
const FEATURE_ICONS = [Tag, Truck, ShieldCheck, Headphones];

type WholesaleCms = {
  hero?: { heading?: string; subheading?: string; ctaText?: string; ctaLink?: string; imageUrl?: string };
  steps?: { title: string; desc: string }[];
  features?: { title: string; desc: string }[];
  quoteCta?: { title?: string; subtitle?: string; ctaText?: string; ctaLink?: string };
};

export default function WholesalePage() {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [wholesaleProducts, setWholesaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cms, setCms] = useState<WholesaleCms | null>(null);
  const format = useCurrencyStore((s) => s.format);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCategories().then((cats) => setCategories(cats.filter((c: any) => c.isActive !== false).slice(0, 5))),
      fetchProducts({ take: 8, isWholesaleOnly: true }).then((prods) => setWholesaleProducts(prods)),
    ]).finally(() => setLoading(false));

    fetch(`${API_BASE}/api/cms/site-config/wholesale`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.value) setCms(d.value); })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 pb-28 md:pb-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground">Wholesale</h1>
          <p className="text-muted-foreground text-xs mt-1 leading-5">
            Bulk buying made simple. Best prices for<br />your business.
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/30 rounded-2xl px-3 py-2.5 flex items-start gap-2 cursor-pointer min-w-[160px] hover:border-primary/50 transition-colors">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-primary mb-0.5">Wholesale Benefits</p>
            <p className="text-[9px] text-muted-foreground leading-snug">Lower prices, priority support<br />and exclusive offers.</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
        </div>
      </div>

      {/* Hero Banner — only shown when admin has configured it */}
      {cms?.hero && (
      <div className="rounded-2xl overflow-hidden mb-6 relative" style={cms.hero.imageUrl ? { backgroundImage: `url(${cms.hero.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: "linear-gradient(135deg, #050F1A 0%, #0A1E2E 100%)" }}>
        <div className="flex items-center p-5 gap-3">
          <div className="flex-1">
            {cms.hero.heading && <h2 className="text-xl font-black text-white leading-tight">{cms.hero.heading.split(",")[0]}{cms.hero.heading.includes(",") ? "," : ""}</h2>}
            {cms.hero.heading?.includes(",") && <h2 className="text-xl font-black text-primary leading-tight mb-2">{cms.hero.heading.split(",")[1]?.trim()}</h2>}
            {cms.hero.subheading && <p className="text-white/50 text-xs mb-4 leading-relaxed">{cms.hero.subheading}</p>}
            {cms.hero.ctaLink && (
              <Link href={cms.hero.ctaLink}>
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-xl font-bold text-xs hover:bg-white/90 transition-all">
                  {cms.hero.ctaText || "Explore"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            )}
          </div>
          <div className="relative flex-shrink-0 w-36 h-32">
            <div className="absolute right-0 top-0 w-22 h-22 rounded-xl overflow-hidden shadow-xl" style={{ width: 80, height: 80 }}>
              {wholesaleProducts[0]?.image ? (
                <img src={wholesaleProducts[0].image} alt={wholesaleProducts[0].name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10" />
              )}
            </div>
            <div className="absolute left-0 bottom-0 w-16 h-16 rounded-xl overflow-hidden shadow-md">
              {wholesaleProducts[1]?.image ? (
                <img src={wholesaleProducts[1].image} alt={wholesaleProducts[1].name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10" />
              )}
            </div>
            <div className="absolute right-0 bottom-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 border-primary/40 bg-primary/10">
              <span className="text-[8px] text-white/60 font-medium">UP TO</span>
              <span className="text-lg font-black text-primary leading-none">40%</span>
              <span className="text-[8px] text-white/60 font-medium">OFF</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Shop by Category */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Shop by Category</h2>
          <Link href="/shop">
            <span className="text-xs text-primary font-semibold cursor-pointer">View All</span>
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="w-[58px] h-[58px] rounded-2xl bg-muted animate-pulse" />
                  <div className="w-10 h-2 bg-muted rounded animate-pulse" />
                </div>
              ))
            : categories.map((cat) => (
                <div key={cat.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
                  <div className="w-[58px] h-[58px] rounded-2xl overflow-hidden border border-border group-hover:border-primary transition-all bg-muted">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">{cat.name[0]}</div>
                    )}
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground group-hover:text-primary transition-colors text-center">{cat.name}</span>
                </div>
              ))}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="w-[58px] h-[58px] rounded-2xl border border-border bg-muted group-hover:border-primary transition-all flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground group-hover:text-primary transition-colors">More</span>
          </div>
        </div>
      </div>

      {/* Feature badges — only shown when admin configures features */}
      {cms?.features && cms.features.length > 0 && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {cms.features.map(({ title, desc }, i) => {
          const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
          return (
            <div key={title} className="flex flex-col items-center text-center p-2 bg-card border border-border rounded-xl">
              <Icon className="w-4 h-4 text-primary mb-1" />
              <p className="text-[9px] font-bold text-foreground leading-tight mb-0.5">{title}</p>
              <p className="text-[8px] text-muted-foreground leading-tight">{desc}</p>
            </div>
          );
        })}
      </div>
      )}

      {/* Top Wholesale Deals */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Top Wholesale Deals</h2>
          <Link href="/shop">
            <span className="text-xs text-primary font-semibold cursor-pointer">View All</span>
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-2.5 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : wholesaleProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {wholesaleProducts.map((p) => (
              <UnifiedProductCard key={p.id} product={p} className="w-full" />
            ))}
          </div>
        )}
      </div>

      {/* Want Better Prices (Quote CTA) — only shown when admin configures it */}
      {cms?.quoteCta && cms.quoteCta.ctaLink && (
      <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 mb-5">
        <div className="flex-1 mr-3">
          {cms.quoteCta.title && <p className="text-xs font-bold text-foreground mb-1">{cms.quoteCta.title}</p>}
          {cms.quoteCta.subtitle && <p className="text-[9px] text-muted-foreground leading-snug">{cms.quoteCta.subtitle}</p>}
        </div>
        <a href={cms.quoteCta.ctaLink} target="_blank" rel="noopener noreferrer">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-[10px] font-bold hover:bg-primary/90 transition-all flex-shrink-0 whitespace-nowrap">
            {cms.quoteCta.ctaText || "Contact Us"} <ArrowRight className="w-3 h-3" />
          </button>
        </a>
      </div>
      )}

      {/* How Wholesale Works — only shown when admin configures steps */}
      {cms?.steps && cms.steps.length > 0 && (
      <div>
        <h2 className="text-sm font-bold text-foreground mb-4">How Wholesale Works</h2>
        <div className="flex items-start">
          {cms.steps.map((step, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <div key={step.title} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center text-center flex-1 min-w-0 px-0.5">
                  <div className="w-10 h-10 rounded-xl border border-border bg-primary/10 flex items-center justify-center mb-2 shadow-sm">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[9px] font-bold text-foreground leading-tight mb-0.5">{i + 1}. {step.title}</p>
                  <p className="text-[8px] text-muted-foreground leading-tight">{step.desc}</p>
                </div>
                {i < (cms.steps || []).length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0 mb-5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
