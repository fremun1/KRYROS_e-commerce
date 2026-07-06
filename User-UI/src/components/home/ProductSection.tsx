import { useState, useEffect, type ReactNode } from "react";
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
  /** @deprecated kept for compat; scroll is always horizontal now */
  scroll?: boolean;
  accentColor?: string;
  /** Decorative banner rendered ABOVE the title/See-All row */
  topBanner?: ReactNode;
}

export default function ProductSection({
  title,
  subtitle,
  viewAllHref = "/shop",
  tabs,
  params = {},
  limit = 10,
  accentColor,
  topBanner,
}: ProductSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);

  const activeParams = tabs ? tabs[activeTab].params : params;

  useEffect(() => {
    fetchProducts({ ...activeParams, take: limit }).then(setProducts);
  }, [activeTab, JSON.stringify(activeParams), limit]);

  if (products.length === 0) return null;

  const accent = accentColor || "#0d9488";

  return (
    <section className="pb-3 md:pb-5">
      <div className="max-w-7xl mx-auto">

        {/* Optional decorative banner (flash sale header, limited stock badge, etc.) */}
        {topBanner}

        {/* Title + See All row */}
        <div className="flex items-center justify-between px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex-shrink-0 w-1 h-6 rounded-full"
              style={{ background: accent }}
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
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <Link href={viewAllHref}>
            <span
              className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap ml-2 transition-colors hover:opacity-80"
              style={{ color: accent, backgroundColor: `${accent}1a` }}
            >
              See All <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {/* Always-horizontal product scroll */}
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
