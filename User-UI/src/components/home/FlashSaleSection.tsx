import { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { fetchFlashSaleProducts, fetchHomepageSections } from '@/lib/api';
import type { Product } from '@/lib/api';
import UnifiedProductCard from '@/components/UnifiedProductCard';

// ─── Timer helpers ────────────────────────────────────────────────
function secondsUntil(end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
}
function decompose(total: number) {
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

interface FlashSaleSectionProps {
  /** Override title (set from DynamicSectionRenderer / admin CMS) */
  title?: string;
  timerLabel?: string;
  ctaText?: string;
  ctaLink?: string;
  /** ISO date string for timer end (from CMS config.timerEndDate) */
  endTime?: string;
  /** Header background color (default: #C1304B red) */
  headerBgColor?: string;
  productLimit?: number;
}

export default function FlashSaleSection({
  title: propTitle,
  timerLabel: propTimerLabel,
  ctaText: propCtaText,
  ctaLink: propCtaLink,
  endTime: propEndTime,
  headerBgColor: propHeaderBgColor,
  productLimit: propProductLimit,
}: FlashSaleSectionProps = {}) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [timeLeft, setTimeLeft]   = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [saleEnded, setSaleEnded] = useState(false);
  const endDateRef = useRef<Date | null>(null);

  // CMS-driven header values (props override CMS, CMS overrides defaults)
  const [cmsTitle,      setCmsTitle]      = useState('Flash Sales');
  const [cmsTimerLabel, setCmsTimerLabel] = useState('TIME LEFT:');
  const [cmsCtaText,    setCmsCtaText]    = useState('See All');
  const [cmsCtaLink,    setCmsCtaLink]    = useState('/shop?isFlashSale=true');
  const [cmsEndTime,    setCmsEndTime]    = useState<string | null>(null);
  const [cmsBgColor,    setCmsBgColor]    = useState('#C1304B');
  const [cmsLimit,      setCmsLimit]      = useState(8);

  const title       = propTitle       ?? cmsTitle;
  const timerLabel  = propTimerLabel  ?? cmsTimerLabel;
  const ctaText     = propCtaText     ?? cmsCtaText;
  const ctaLink     = propCtaLink     ?? cmsCtaLink;
  const headerBg    = propHeaderBgColor ?? cmsBgColor;
  const limit       = propProductLimit  ?? cmsLimit;

  useEffect(() => {
    Promise.all([
      fetchFlashSaleProducts(),
      fetchHomepageSections('FlashSale'),
    ]).then(([prods, sections]) => {
      setProducts(prods);

      const cmsSection = sections.find((s) => s.type === 'FlashSale');
      const cfg = (cmsSection?.config ?? {}) as Record<string, unknown>;

      if (cfg.title)          setCmsTitle(String(cfg.title));
      if (cfg.countdownLabel) setCmsTimerLabel(String(cfg.countdownLabel));
      if (cfg.ctaText)        setCmsCtaText(String(cfg.ctaText));
      if (cfg.ctaLink)        setCmsCtaLink(String(cfg.ctaLink));
      if (cfg.headerBgColor)  setCmsBgColor(String(cfg.headerBgColor));
      if (cfg.productLimit)   setCmsLimit(Number(cfg.productLimit) || 8);
      if (cfg.endTime)        setCmsEndTime(String(cfg.endTime));

      // Timer source priority:
      // 1. Prop endTime (from DynamicSectionRenderer / admin panel)
      // 2. CMS config.endTime
      // 3. Earliest product flashSaleEnd
      // 4. End of today
      const endTimeStr = propEndTime || (cfg.endTime ? String(cfg.endTime) : null);
      let end: Date | null = null;

      if (endTimeStr) {
        const d = new Date(endTimeStr);
        if (!isNaN(d.getTime())) end = d;
      }

      if (!end) {
        const timestamps = prods
          .filter((p) => p.flashSaleEnd)
          .map((p) => new Date(p.flashSaleEnd!).getTime())
          .filter((t) => !isNaN(t));
        if (timestamps.length > 0) end = new Date(Math.min(...timestamps));
      }

      if (!end) {
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }

      endDateRef.current = end;
      const secs = secondsUntil(end);
      setTimeLeft(decompose(secs));
      if (secs === 0) setSaleEnded(true);
      setLoading(false);
    });
  }, []);

  // ── Countdown tick ────────────────────────────────────────────
  useEffect(() => {
    if (loading || !endDateRef.current) return;
    const tick = setInterval(() => {
      const secs = secondsUntil(endDateRef.current!);
      setTimeLeft(decompose(secs));
      if (secs === 0) { setSaleEnded(true); clearInterval(tick); }
    }, 1000);
    return () => clearInterval(tick);
  }, [loading]);

  const fmt = (v: number) => String(v).padStart(2, '0');
  const displayProducts = products.slice(0, limit);

  if (!loading && displayProducts.length === 0) return null;

  return (
    <section className="w-full bg-white">

      {/* ── Colored header bar (Jumia Variant 2 — Flash Sale) ─── */}
      <div
        className="px-4 py-3 sm:px-6"
        style={{ backgroundColor: headerBg }}
      >
        {/* Row 1: icon + title + See All */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none" aria-hidden>🏷️</span>
            <h2 className="text-[20px] leading-[28px] font-bold text-white">{title}</h2>
          </div>
          <a
            href={ctaLink}
            className="flex items-center gap-0.5 text-white text-[14px] font-semibold hover:text-white/80 transition shrink-0 whitespace-nowrap"
          >
            {ctaText} <ChevronRight size={16} strokeWidth={2.5} />
          </a>
        </div>

        {/* Row 2: countdown timer */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-white text-[11px] font-semibold uppercase tracking-wider opacity-90">
            {timerLabel}
          </span>

          {saleEnded ? (
            <span className="text-white text-sm font-bold opacity-80">Sale ended</span>
          ) : loading ? (
            <div className="flex items-center gap-1 font-bold text-white opacity-60">
              {['--h','--m','--s'].map((lbl, i) => (
                <span key={i} className="text-xs bg-white/20 px-2 py-0.5 rounded">{lbl}</span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 font-bold text-white">
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded">{fmt(timeLeft.hours)}h</span>
              <span className="text-xs opacity-80">:</span>
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded">{fmt(timeLeft.minutes)}m</span>
              <span className="text-xs opacity-80">:</span>
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded">{fmt(timeLeft.seconds)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Products (horizontal scroll) ──────────────────────── */}
      <div className="px-4 pt-3 pb-4 sm:px-6">
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[1,2,3].map((i) => (
              <div key={i} className="shrink-0 w-[calc(50vw-20px)] sm:w-48 aspect-[3/4] bg-muted rounded-lg animate-pulse"/>
            ))}
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar"
          >
            {displayProducts.map((product) => (
              <div key={product.id} className="snap-start shrink-0 w-[calc(50vw-20px)] sm:w-48 md:w-52">
                <UnifiedProductCard product={product} className="w-full" imageStyle="contain" />
              </div>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}
