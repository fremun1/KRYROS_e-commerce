import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Zap } from "lucide-react";
import { fetchFlashSaleProducts, fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";
import type { Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface FlashSaleConfig {
  title: string;
  endTime: string;
  limit: number;
  countdownLabel: string;
  ctaText: string;
  ctaLink: string;
}

function parseCountdownDate(value?: string | null): Date | null {
  if (!value || !value.trim()) return null;

  const trimmed = value.trim();
  const asNumber = Number(trimmed);
  const date = Number.isFinite(asNumber) && /^\d+$/.test(trimmed)
    ? new Date(asNumber > 1e12 ? asNumber : asNumber * 1000)
    : new Date(trimmed);

  return Number.isNaN(date.getTime()) ? null : date;
}

function useCountdown(targetDate: Date | null) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const calculateTotal = () => {
      if (!targetDate) return 0;
      const diff = Math.floor((targetDate.getTime() - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    };

    setTotal(calculateTotal());
    const timer = setInterval(() => setTotal(calculateTotal()), 1000);
    return () => clearInterval(timer);
  }, [targetDate?.getTime()]);

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  return { days, hours, mins, secs, total };
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
    limit: Number.parseInt(String(cfg.limit ?? "8"), 10) || 8,
    countdownLabel: cfg.countdownLabel || "Time Left",
    ctaText: cfg.ctaText || sec.linkText || "See All",
    ctaLink: cfg.ctaLink || sec.link || "/shop",
  };
}

function getFallbackProductEndTime(products: Product[]): Date | null {
  const futureTimes = products
    .map((product) => parseCountdownDate(product.flashSaleEnd))
    .filter((date): date is Date => !!date && date.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime());

  return futureTimes[0] || null;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[54px] rounded-md bg-white/15 px-2 py-1 text-center backdrop-blur-sm">
      <div className="text-sm md:text-base font-black leading-none text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
        {label}
      </div>
    </div>
  );
}

export default function FlashSaleSection() {
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

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

  const countdownTarget = useMemo(() => {
    const cmsDate = parseCountdownDate(config?.endTime);
    if (cmsDate && cmsDate.getTime() > Date.now()) return cmsDate;
    return getFallbackProductEndTime(products);
  }, [config?.endTime, products]);

  const { days, hours, mins, secs, total: countdownTotal } = useCountdown(countdownTarget);
  const hasTimer = countdownTotal > 0;

  if (products.length === 0) return null;

  const displayTitle = config?.title || "Flash Sales";
  const countdownLabel = (config?.countdownLabel || "Time Left").toUpperCase();
  const ctaText = config?.ctaText || "See All";
  const ctaLink = config?.ctaLink || "/shop";

  return (
    <section className="w-full px-0 md:px-4 py-4">
      <div className="w-full py-3 px-4 md:px-6" style={{ background: "linear-gradient(to right, #D91C45, #E8334D)" }}>
        <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-6 h-6 md:w-7 md:h-7 fill-yellow-300 text-yellow-300 flex-shrink-0" />
            <h2 className="text-white font-black text-lg md:text-2xl tracking-tight leading-none truncate">
              {displayTitle}
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:flex-1">
            {hasTimer && (
              <div className="flex flex-col gap-2 sm:items-end">
                <span className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
                  {countdownLabel}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {days > 0 && <CountdownUnit value={days} label="Days" />}
                  <CountdownUnit value={hours} label="Hrs" />
                  <CountdownUnit value={mins} label="Mins" />
                  <CountdownUnit value={secs} label="Secs" />
                </div>
              </div>
            )}

            <Link href={ctaLink}>
              <span className="inline-flex items-center justify-center rounded-md border border-white/30 px-4 py-2 text-white font-bold text-sm md:text-base whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors">
                {ctaText}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar px-4 md:px-6 py-4 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex gap-3 pb-2">
          {products.map((p) => {
            const stockTotal: number = p.stockTotal ?? p.stockCurrent ?? p.stock ?? 50;
            const stockCurrent: number = p.stockCurrent ?? p.stock ?? stockTotal;
            const soldUnits = Math.max(0, stockTotal - stockCurrent);
            const soldPct = stockTotal > 0 ? Math.min(100, Math.round((soldUnits / stockTotal) * 100)) : 0;

            return (
              <div
                key={p.id}
                className="flex-shrink-0 w-[140px] md:w-[160px] lg:w-[180px] flex flex-col"
              >
                <div className="flex-1 mb-2">
                  <UnifiedProductCard product={p} />
                </div>

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
