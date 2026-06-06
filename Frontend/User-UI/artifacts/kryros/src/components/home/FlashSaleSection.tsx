import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Zap, ChevronRight, Clock } from "lucide-react";
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
      if (!endTimeStr) return 8 * 3600; // Fallback to 8 hours if no time set
      const end = new Date(endTimeStr).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((end - now) / 1000);
      return diff > 0 ? diff : 8 * 3600; // Fallback to 8 hours if expired
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
  return { hours, mins, secs };
}

function homepageSectionToFlashSale(sec: ApiHomepageSection): FlashSaleConfig | null {
  let cfg = (sec.config || {}) as Record<string, any>;
  
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      return null;
    }
  }

  return {
    title: cfg.title || sec.title || "FLASH SALE",
    timer_title: cfg.timer_title || cfg.title || sec.title || "FLASH SALE",
    endTime: cfg.endTime || "",
    limit: parseInt(cfg.limit) || 8,
    discount_text: cfg.discount_text || "UP TO 50% OFF",
  };
}

export default function FlashSaleSection() {
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { hours, mins, secs } = useCountdown(config?.endTime || "");

  useEffect(() => {
    fetchHomepageSections("FlashSale")
      .then((sections) => {
        if (sections.length > 0) {
          const mapped = homepageSectionToFlashSale(sections[0]);
          setConfig(mapped);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const limit = config?.limit || 8;
    fetchFlashSaleProducts().then((data) => setProducts(data.slice(0, limit)));
  }, [config?.limit]);

  // Always show if products exist, even if loading or config is missing
  if (products.length === 0) return null;

  const displayTitle = config?.title || "Flash Sale";
  const timerTitle = config?.timer_title || displayTitle;
  const discountBadge = config?.discount_text || "UP TO 50% OFF";

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <h2 className="text-base md:text-lg font-black text-foreground">{displayTitle}</h2>
        </div>
        <Link href="/shop">
          <span className="flex items-center gap-0.5 text-xs md:text-sm text-primary font-semibold cursor-pointer hover:underline">
            View All Deals <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 items-stretch">
        {/* Countdown Timer Card — compact, matches product card height */}
        <div className="flex-shrink-0 w-[calc(50vw-16px)] md:w-[160px] bg-white dark:bg-[#0D1523] border-2 border-primary/30 dark:border-primary/40 rounded-2xl flex flex-col items-center justify-evenly py-3 px-3 shadow-sm">
          {/* Lightning Icon */}
          <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />

          {/* FLASH SALE Title — single line, never wraps */}
          <h3 className="text-[11px] font-black text-foreground dark:text-white tracking-tight uppercase whitespace-nowrap">{timerTitle}</h3>

          {/* Divider with ENDS IN */}
          <div className="flex items-center gap-1 w-full">
            <div className="flex-1 h-px bg-border dark:bg-border/50" />
            <p className="text-[9px] text-muted-foreground dark:text-[#8E9AAF] font-semibold tracking-widest uppercase whitespace-nowrap">Ends In</p>
            <div className="flex-1 h-px bg-border dark:bg-border/50" />
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-1">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-primary dark:text-[#1FA89A] tabular-nums leading-none">
                {String(hours).padStart(2, "0")}
              </span>
              <span className="text-[8px] text-muted-foreground dark:text-[#8E9AAF] mt-0.5 font-bold tracking-wider uppercase">HRS</span>
            </div>

            {/* Separator */}
            <span className="text-lg font-black text-muted-foreground dark:text-[#8E9AAF] mb-1">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-primary dark:text-[#1FA89A] tabular-nums leading-none">
                {String(mins).padStart(2, "0")}
              </span>
              <span className="text-[8px] text-muted-foreground dark:text-[#8E9AAF] mt-0.5 font-bold tracking-wider uppercase">MINS</span>
            </div>

            {/* Separator */}
            <span className="text-lg font-black text-muted-foreground dark:text-[#8E9AAF] mb-1">:</span>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-primary dark:text-[#1FA89A] tabular-nums leading-none">
                {String(secs).padStart(2, "0")}
              </span>
              <span className="text-[8px] text-muted-foreground dark:text-[#8E9AAF] mt-0.5 font-bold tracking-wider uppercase">SECS</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-border dark:bg-border/50" />

          {/* Discount Badge */}
          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-2 py-1.5 w-full justify-center">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-2 h-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
            <span className="text-[10px] font-black text-foreground dark:text-white whitespace-nowrap uppercase">
              {discountBadge.includes('%') ? (
                <>UP TO <span className="text-red-600 dark:text-red-500">{discountBadge.match(/\d+%/)?.[0] || '50%'} OFF</span></>
              ) : (
                discountBadge
              )}
            </span>
          </div>

          {/* Limited Time Footer */}
          <div className="flex items-center gap-1 text-muted-foreground dark:text-[#8E9AAF]">
            <Clock className="w-3 h-3 text-primary dark:text-[#1FA89A] flex-shrink-0" />
            <span className="text-[9px] font-medium whitespace-nowrap">Limited time only</span>
          </div>
        </div>

        {/* Flash Sale Products */}
        {products.map((p) => (
          <UnifiedProductCard
            key={p.id}
            product={p}
            className="flex-shrink-0 w-[calc(50vw-16px)] md:w-[140px]"
          />
        ))}
      </div>
    </section>
  );
}
