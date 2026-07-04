import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Zap } from "lucide-react";
import { fetchFlashSaleProducts, fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";
import type { Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface FlashSaleConfig {
  title: string;
  endTime: string;
  limit: number;
}

function useCountdown(endTimeStr: string) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const calculateTotal = () => {
      if (!endTimeStr) return 0;
      const end = new Date(endTimeStr).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((end - now) / 1000);
      return diff > 0 ? diff : 0;
    };

    setTotal(calculateTotal());
    const t = setInterval(() => {
      setTotal((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [endTimeStr]);

  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { hours, mins, secs, total };
}

function homepageSectionToFlashSale(sec: ApiHomepageSection): FlashSaleConfig | null {
  let cfg = (sec.config || {}) as Record<string, any>;
  if (typeof cfg === "string") {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      return null;
    }
  }
  return {
    title: cfg.title || sec.title || "Flash Sales",
    endTime: cfg.endTime || "",
    limit: parseInt(cfg.limit) || 8,
  };
}

export default function FlashSaleSection() {
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const { hours, mins, secs, total: countdownTotal } = useCountdown(config?.endTime || "");
  const hasTimer = !!config?.endTime && countdownTotal > 0;

  useEffect(() => {
    fetchHomepageSections("FlashSale").then((sections) => {
      if (sections.length > 0) {
        setConfig(homepageSectionToFlashSale(sections[0]));
      }
    });
  }, []);

  useEffect(() => {
    const limit = config?.limit || 8;
    fetchFlashSaleProducts().then((data) => setProducts(data.slice(0, limit)));
  }, [config?.limit]);

  if (products.length === 0) return null;

  const displayTitle = config?.title || "Flash Sales";

  return (
    <section className="w-full px-0 md:px-4 py-4">
      {/* ── Jumia-style RED banner header ── */}
      <div className="w-full py-3 px-4 md:px-6" style={{ background: "linear-gradient(to right, #D91C45, #E8334D)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Zap className="w-6 h-6 md:w-7 md:h-7 fill-yellow-300 text-yellow-300 flex-shrink-0" />
            <h2 className="text-white font-black text-lg md:text-2xl tracking-tight leading-none">
              {displayTitle}
            </h2>
          </div>

          {/* Right: Timer (if exists) and See All */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {hasTimer && (
              <div className="text-white text-xs md:text-sm font-semibold tabular-nums whitespace-nowrap">
                TIME LEFT:{" "}
                <span className="font-bold">
                  {String(hours).padStart(2, "0")}h : {String(mins).padStart(2, "0")}m : {String(secs).padStart(2, "0")}s
                </span>
              </div>
            )}
            <Link href="/shop">
              <span className="text-white font-bold text-sm md:text-base whitespace-nowrap cursor-pointer hover:underline">
                See All
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Products horizontal scroll ── */}
      <div className="w-full overflow-x-auto no-scrollbar px-4 md:px-6 py-4 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex gap-3 pb-2">
          {products.map((p) => {
            // Compute sold % from stockTotal / stockCurrent on the raw product
            const raw = p as any;
            const stockTotal: number = raw.stockTotal ?? raw.stockCurrent ?? 50;
            const stockCurrent: number = p.stock ?? stockTotal;
            const soldUnits = Math.max(0, stockTotal - stockCurrent);
            const soldPct =
              stockTotal > 0 ? Math.min(100, Math.round((soldUnits / stockTotal) * 100)) : 0;

            return (
              <div
                key={p.id}
                className="flex-shrink-0 w-[140px] md:w-[160px] lg:w-[180px] flex flex-col"
              >
                {/* Product card — use the standard card styling */}
                <div className="flex-1 mb-2">
                  <UnifiedProductCard product={p} />
                </div>

                {/* ── Sold progress bar (Jumia-style) ── */}
                <div className="px-2">
                  <div className="h-2 w-full bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${soldPct}%`,
                        background:
                          soldPct >= 80
                            ? "#ef4444"
                            : soldPct >= 50
                            ? "#f26522"
                            : "#22c55e",
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1 font-semibold text-gray-700 dark:text-gray-300">
                    {soldPct} items left
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
