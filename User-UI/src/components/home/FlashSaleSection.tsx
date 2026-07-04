import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Zap, ChevronRight } from "lucide-react";
import { fetchFlashSaleProducts, fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";
import type { Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface FlashSaleConfig {
  title: string;
  timer_title: string;
  endTime: string;
  limit: number;
  discount_text: string;
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
    timer_title: cfg.timer_title || cfg.title || sec.title || "Flash Sales",
    endTime: cfg.endTime || "",
    limit: parseInt(cfg.limit) || 8,
    discount_text: cfg.discount_text || "UP TO 50% OFF",
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
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-4">
      {/* ── Jumia-style header bar ── */}
      <div
        className="rounded-t-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f26522 0%, #e04e0a 100%)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          {/* Left: icon + title + countdown */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Zap className="w-4 h-4 fill-white text-white flex-shrink-0" />
            <span className="text-white font-black text-sm md:text-base tracking-tight uppercase whitespace-nowrap">
              {displayTitle}
            </span>

            {hasTimer && (
              <div className="flex items-center gap-1 ml-1">
                <span className="text-white/70 text-[10px] font-semibold whitespace-nowrap hidden sm:inline mr-0.5">
                  Ends in
                </span>
                {/* Hours */}
                <div className="flex flex-col items-center">
                  <span className="bg-black/35 text-white font-black text-sm tabular-nums leading-none px-1.5 py-0.5 rounded-md min-w-[26px] text-center">
                    {String(hours).padStart(2, "0")}
                  </span>
                  <span className="text-white/50 text-[7px] font-bold tracking-wider uppercase mt-0.5">
                    H
                  </span>
                </div>
                <span className="text-white/50 font-black text-sm pb-3">:</span>
                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <span className="bg-black/35 text-white font-black text-sm tabular-nums leading-none px-1.5 py-0.5 rounded-md min-w-[26px] text-center">
                    {String(mins).padStart(2, "0")}
                  </span>
                  <span className="text-white/50 text-[7px] font-bold tracking-wider uppercase mt-0.5">
                    M
                  </span>
                </div>
                <span className="text-white/50 font-black text-sm pb-3">:</span>
                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <span className="bg-black/35 text-white font-black text-sm tabular-nums leading-none px-1.5 py-0.5 rounded-md min-w-[26px] text-center">
                    {String(secs).padStart(2, "0")}
                  </span>
                  <span className="text-white/50 text-[7px] font-bold tracking-wider uppercase mt-0.5">
                    S
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: See All */}
          <Link href="/shop">
            <span className="flex items-center gap-0.5 text-white font-bold text-xs whitespace-nowrap bg-white/25 hover:bg-white/35 active:bg-white/40 transition-colors px-2.5 py-1 rounded-full cursor-pointer select-none">
              See All <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>

      {/* ── Products horizontal scroll ── */}
      <div className="border border-t-0 border-border dark:border-border/40 rounded-b-2xl overflow-hidden bg-card">
        <div className="flex overflow-x-auto no-scrollbar">
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
                className="flex-shrink-0 w-[calc(50vw-16px)] md:w-[180px] lg:w-[200px] border-r border-border dark:border-border/40 last:border-r-0 flex flex-col"
              >
                {/* Product card — no rounding/shadow so it tiles cleanly */}
                <div className="flex-1">
                  <UnifiedProductCard
                    product={p}
                    className="rounded-none border-0 shadow-none"
                  />
                </div>

                {/* ── Sold progress bar ── */}
                <div className="px-2.5 pb-3 pt-0">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
                  <p className="text-[10px] mt-1 font-semibold">
                    {soldPct >= 80 ? (
                      <span className="text-red-500">🔥 {soldPct}% sold</span>
                    ) : soldPct > 0 ? (
                      <span className="text-muted-foreground">{soldPct}% sold</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">In Stock</span>
                    )}
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
