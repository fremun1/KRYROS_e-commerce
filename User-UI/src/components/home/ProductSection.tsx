import { useState, useEffect, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface ApiParams {
  take?: number;
  skip?: number;
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  isFlashSale?: boolean;
  popularity?: "trending" | "bestseller" | "new" | "hot" | "sale";
  lowStock?: boolean;
}

interface TabDef {
  label: string;
  params: ApiParams;
}

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllText?: string;
  tabs?: TabDef[];
  params?: ApiParams;
  limit?: number;
  /** @deprecated kept for compat */
  scroll?: boolean;
  accentColor?: string;
  /** Decorative banner rendered ABOVE the title/See-All row */
  topBanner?: ReactNode;
}

export default function ProductSection({
  title,
  subtitle,
  viewAllHref = "/shop",
  viewAllText = "See All",
  tabs,
  params = {},
  limit = 10,
  topBanner,
}: ProductSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);

  const activeParams = tabs ? tabs[activeTab].params : params;

  useEffect(() => {
    fetchProducts({ ...activeParams, take: limit }).then(setProducts);
  }, [activeTab, JSON.stringify(activeParams), limit]);

  if (products.length === 0) return null;

  return (
    <section className="pb-4 md:pb-6 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* Optional decorative banner above header (used by flash/deal sections externally) */}
        {topBanner}

        {/* ── Jumia-style plain section header ─────────────────────── */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[20px] leading-[28px] font-bold text-foreground tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] leading-[18px] text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
            {/* Tab switcher (if tabs provided) */}
            {tabs && (
              <div className="flex gap-1 mt-2">
                {tabs.map((tab, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === i
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href={viewAllHref}
            className="flex items-center gap-0.5 text-[14px] font-semibold text-primary hover:text-primary/80 transition-colors shrink-0 whitespace-nowrap ml-4"
          >
            {viewAllText}
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </a>
        </div>

        {/* ── Horizontal product scroll ──────────────────────────── */}
        <div
          className="flex gap-3 overflow-x-auto pb-2 px-4 md:px-6 snap-x snap-mandatory no-scrollbar"
        >
          {products.map((product) => (
            <div key={product.id} className="snap-start shrink-0 w-[calc(50vw-20px)] sm:w-48 md:w-52">
              <UnifiedProductCard product={product} className="w-full" imageStyle="contain" />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
