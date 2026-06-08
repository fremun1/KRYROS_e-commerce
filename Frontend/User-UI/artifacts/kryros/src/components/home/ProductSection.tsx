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
  viewAllHref?: string;
  tabs?: TabDef[];
  params?: ApiParams;
  limit?: number;
  scroll?: boolean;
}

export default function ProductSection({
  title,
  viewAllHref = "/shop",
  tabs,
  params = {},
  limit = 8,
  scroll = true,
}: ProductSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);

  const activeParams = tabs ? tabs[activeTab].params : params;

  useEffect(() => {
    fetchProducts({ ...activeParams, take: limit }).then(setProducts);
  }, [activeTab, JSON.stringify(activeParams), limit]);

  if (products.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="px-3 md:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base md:text-xl font-black text-foreground">{title}</h2>
            {tabs && (
              <div className="flex gap-1">
                {tabs.map((tab, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-semibold transition-all ${
                      activeTab === i ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href={viewAllHref}>
            <span className="text-xs md:text-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-0.5 whitespace-nowrap">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {/* Scroll layout: horizontal, fixed-width cards */}
        {scroll ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible">
            {products.map((p) => (
              <UnifiedProductCard
                key={p.id}
                product={p}
                className="flex-shrink-0 w-[calc(50vw-16px)] md:w-full"
              />
            ))}
          </div>
        ) : (
          /* Grid layout: 2-col on mobile, more on desktop */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {products.map((p) => (
              <UnifiedProductCard
                key={p.id}
                product={p}
                className="w-full"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
