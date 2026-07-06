import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight, Sparkles } from "lucide-react";
import { fetchProducts, fetchHomepageSections } from "@/lib/api";
import type { Product, ApiHomepageSection } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

export default function NewestArrivalsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(true);
  const [sectionTitle, setSectionTitle] = useState("Newest Arrivals");
  const [ctaText, setCtaText] = useState("View All");
  const [ctaLink, setCtaLink] = useState("/shop");

  useEffect(() => {
    Promise.all([
      fetchProducts({ popularity: "new", take: 12 }),
      fetchHomepageSections("NewestArrivals"),
    ]).then(([prods, sections]) => {
      setProducts(prods.slice(0, 12));

      const cms = sections.find((s: ApiHomepageSection) => s.type === "NewestArrivals");
      const cfg = (cms?.config ?? {}) as Record<string, unknown>;

      if (cfg.title) setSectionTitle(String(cfg.title));
      if (typeof cfg.scroll === "boolean") setScroll(cfg.scroll);
      if (cfg.ctaText) setCtaText(String(cfg.ctaText));
      if (cfg.ctaLink) setCtaLink(String(cfg.ctaLink));

      setLoading(false);
    });
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-base md:text-xl font-black text-foreground">{sectionTitle}</h2>
        </div>
        <Link href={ctaLink}>
          <span className="text-xs md:text-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-0.5 whitespace-nowrap">
            {ctaText} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {loading ? (
        <div className={`flex gap-2 ${scroll ? "overflow-hidden" : ""}`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[calc(50vw-16px)] md:w-full" style={{ aspectRatio: "3/4" }} />
          ))}
        </div>
      ) : (
        <div className={scroll ? "flex gap-2 overflow-x-auto no-scrollbar pb-1 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"}>
          {products.map((p) => (
            <UnifiedProductCard
              key={p.id}
              product={p}
              className={scroll ? "flex-shrink-0 w-[calc(50vw-16px)] md:w-full" : "w-full"}
            />
          ))}
        </div>
      )}
    </section>
  );
}
