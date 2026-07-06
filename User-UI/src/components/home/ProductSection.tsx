import { useState, useEffect } from "react";
import { Link } from "wouter";
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
}

interface TabDef {
  label: string;
  params: ApiParams;
}

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  tabs?: TabDef[];
  params?: ApiParams;
  limit?: number;
  /** @deprecated scroll is always true now; kept for backward compat */
  scroll?: boolean;
  accentColor?: string;
}

export default function ProductSection({
  title,
  subtitle,
  viewAllHref = "/shop",
  tabs,
  params = {},
  limit = 10,
  accentColor,
}: ProductSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);

  const activeParams = tabs ? tabs[activeTab].params : params;

  useEffect(() => {
    fetchProducts({ ...activeParams, take: limit }).then(setProducts);
  }, [activeTab, JSON.stringify(activeParams), limit]);

  if (products.length === 0) return null;

  return (
    <section className="py-3 md:py-5">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 md:px-6 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Accent bar */}
            <div
              className="flex-shrink-0 w-1 h-7 rounded-full"
              style={{ background: accentColor || "var(--color-primary, #0d9488)" }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-base font-black text-foreground tracking-tight truncate">
                  {title}
                </h2>
                {tabs && (
                  <div className="flex gap-1">
                    {tabs.map((tab, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTab(i)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-semibold transition-all ${
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
              {subtitle && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{subtitle}</p>
              )}
            </div>
          </div>

          {/* See All button */}
          <Link href={viewAllHref}>
            <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap ml-2">
              See All <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {/* Horizontal scroll — always, on every screen size */}
        <div
          className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 md:px-6 pb-2"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="flex-shrink-0 snap-start"
              style={{ width: "clamp(148px, 44vw, 200px)" }}
            >
              <UnifiedProductCard product={p} className="w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
