import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight, PlugZap } from "lucide-react";
import { fetchProducts, fetchHomepageSections, fetchCategories } from "@/lib/api";
import type { Product, ApiHomepageSection, ApiCategory } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

export default function AppliancesDealSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionTitle, setSectionTitle] = useState("Appliances Deal");
  const [ctaText, setCtaText] = useState("View All");
  const [ctaLink, setCtaLink] = useState("/shop");
  const [scroll, setScroll] = useState(true);
  const [limit, setLimit] = useState(8);

  useEffect(() => {
    const load = async () => {
      // Fetch all categories to find appliances-related ones
      const allCategories = await fetchCategories();
      const applianceSlugs: string[] = [];

      // Look for categories that match appliances-related names
      const matchKeywords = ["appliance", "home appliance", "kitchen", "washing", "fridge", "refrigerator", "microwave", "cooker", "oven", "iron", "fan", "blender", "toaster", "heater", "heater", "ac", "air conditioner", "vacuum"];
      allCategories.forEach((cat: ApiCategory) => {
        const nameLower = cat.name.toLowerCase();
        if (matchKeywords.some((kw) => nameLower.includes(kw))) {
          if (cat.slug) applianceSlugs.push(cat.slug);
        }
      });

      // If no appliance categories found, fallback to fetching popular products
      let prods: Product[] = [];
      if (applianceSlugs.length > 0) {
        // Try to fetch from the first matching category
        prods = await fetchProducts({ categorySlug: applianceSlugs[0], take: 12 });
      }
      if (prods.length === 0) {
        prods = await fetchProducts({ popularity: "bestseller", take: 12 });
      }

      setProducts(prods.slice(0, 12));

      const sections = await fetchHomepageSections("AppliancesDeal");
      const cms = sections.find((s: ApiHomepageSection) => s.type === "AppliancesDeal");
      const cfg = (cms?.config ?? {}) as Record<string, unknown>;

      if (cfg.title) setSectionTitle(String(cfg.title));
      if (cfg.ctaText) setCtaText(String(cfg.ctaText));
      if (cfg.ctaLink) setCtaLink(String(cfg.ctaLink));
      if (cfg.limit) setLimit(Number(cfg.limit) || 8);
      if (typeof cfg.scroll === "boolean") setScroll(cfg.scroll);

      setLoading(false);
    };
    load();
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlugZap className="w-4 h-4 text-primary" />
          <h2 className="text-base md:text-xl font-black text-foreground">{sectionTitle}</h2>
        </div>
        <Link href={ctaLink}>
          <span className="text-xs md:text-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-0.5 whitespace-nowrap">
            {ctaText} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

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
            />
          ))}
        </div>
      )}
    </section>
  );
}
