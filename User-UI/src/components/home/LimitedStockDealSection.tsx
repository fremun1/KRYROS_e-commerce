import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight, AlertCircle } from "lucide-react";
import { fetchProducts, fetchHomepageSections } from "@/lib/api";
import type { Product, ApiHomepageSection } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

export default function LimitedStockDealSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionTitle, setSectionTitle] = useState("Limited Stock Deal");
  const [discountLabel, setDiscountLabel] = useState("Up to 70% Off");
  const [ctaText, setCtaText] = useState("Shop Now");
  const [ctaLink, setCtaLink] = useState("/shop");
  const [scroll, setScroll] = useState(true);
  const [limit, setLimit] = useState(8);

  useEffect(() => {
    Promise.all([
      fetchProducts({ popularity: "bestseller", take: 12 }),
      fetchHomepageSections("LimitedStockDeal"),
    ]).then(([prods, sections]) => {
      setProducts(prods.slice(0, 12));

      const cms = sections.find((s: ApiHomepageSection) => s.type === "LimitedStockDeal");
      const cfg = (cms?.config ?? {}) as Record<string, unknown>;

      if (cfg.title) setSectionTitle(String(cfg.title));
      if (cfg.discountText) setDiscountLabel(String(cfg.discountText));
      if (cfg.discountPercent) {
        const pct = Number(cfg.discountPercent) || 70;
        setDiscountLabel(`Up to ${pct}% Off`);
      }
      if (cfg.ctaText) setCtaText(String(cfg.ctaText));
      if (cfg.ctaLink) setCtaLink(String(cfg.ctaLink));
      if (cfg.limit) setLimit(Number(cfg.limit) || 8);
      if (typeof cfg.scroll === "boolean") setScroll(cfg.scroll);

      setLoading(false);
    });
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-4 md:py-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h2 className="text-base md:text-xl font-black text-foreground">{sectionTitle}</h2>
            <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {discountLabel}
            </span>
          </div>
          <Link href={ctaLink}>
            <span className="text-xs md:text-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-0.5 whitespace-nowrap">
              {ctaText} <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {/* Products */}
        {loading ? (
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[calc(50vw-16px)] md:w-full" style={{ aspectRatio: "3/4" }} />
            ))}
          </div>
        ) : (
          <div className={scroll ? "flex gap-2 overflow-x-auto no-scrollbar pb-1 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"}>
            {products.slice(0, limit).map((p) => (
              <UnifiedProductCard
                key={p.id}
                product={p}
                className={scroll ? "flex-shrink-0 w-[calc(50vw-16px)] md:w-full" : "w-full"}
                badge={p.discount >= 20 ? "🔥 Limited Stock" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
