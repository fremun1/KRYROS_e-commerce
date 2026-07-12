import { useState, useEffect, useRef, type ReactNode } from "react";
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
  showTimer?: boolean;
  showPercent?: boolean;
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
  showTimer = false,
  showPercent = false,
}: ProductSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);

  const activeParams = tabs ? tabs[activeTab].params : params;

  useEffect(() => {
    fetchProducts({ ...activeParams, take: limit }).then(setProducts);
  }, [activeTab, JSON.stringify(activeParams), limit]);

  // ─── Timer logic ───
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const endDateRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!showTimer || products.length === 0) return;

    const timestamps = products
      .filter((p) => p.flashSaleEnd)
      .map((p) => new Date(p.flashSaleEnd!).getTime())
      .filter((t) => !isNaN(t));
    
    let end = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    if (!end) {
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }
    endDateRef.current = end;

    const tick = setInterval(() => {
      const totalSeconds = Math.max(0, Math.floor((endDateRef.current!.getTime() - Date.now()) / 1000));
      setTimeLeft({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
      if (totalSeconds === 0) clearInterval(tick);
    }, 1000);

    return () => clearInterval(tick);
  }, [showTimer, products]);

  const fmt = (v: number) => String(v).padStart(2, '0');

  if (products.length === 0) return null;

  return (
    <section className="pb-4 md:pb-6 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* Optional decorative banner above header (used by flash/deal sections externally) */}
        {topBanner}

        {/* ── Jumia-style plain section header ─────────────────────── */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-[20px] leading-[28px] font-bold text-foreground tracking-tight">
                {title}
              </h2>
              {showTimer && products.length > 0 && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-80">
                    Ends in:
                  </span>
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <span className="text-sm bg-black/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.hours)}h</span>
                    <span className="text-sm bg-black/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.minutes)}m</span>
                    <span className="text-sm bg-black/10 px-1.5 py-0.5 rounded">{fmt(timeLeft.seconds)}s</span>
                  </div>
                </div>
              )}
            </div>
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
