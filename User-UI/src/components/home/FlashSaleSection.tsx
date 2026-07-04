import { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { fetchFlashSaleProducts, fetchHomepageCategories, fetchHomepageSections } from '@/lib/api';
import type { Product, ApiCategory } from '@/lib/api';
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

export default function FlashSaleSection() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [timeLeft, setTimeLeft]   = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [saleEnded, setSaleEnded] = useState(false);
  const endDateRef = useRef<Date | null>(null);

  // CMS-driven header values (with safe fallbacks)
  const [title,      setTitle]      = useState('Flash Sales');
  const [timerLabel, setTimerLabel] = useState('TIME LEFT:');
  const [ctaText,    setCtaText]    = useState('See All');
  const [ctaLink,    setCtaLink]    = useState('/shop?isFlashSale=true');

  // ── Fetch everything in parallel ──────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchFlashSaleProducts(),
      fetchHomepageCategories(),
      fetchHomepageSections('FlashSale'),
    ]).then(([prods, cats, sections]) => {
      setProducts(prods);
      setCategories(cats);

      // Apply CMS config if present
      const cmsSection = sections.find((s) => s.type === 'FlashSale');
      const cfg = (cmsSection?.config ?? {}) as Record<string, unknown>;

      if (cfg.title)          setTitle(String(cfg.title));
      if (cfg.countdownLabel) setTimerLabel(String(cfg.countdownLabel));
      if (cfg.ctaText)        setCtaText(String(cfg.ctaText));
      if (cfg.ctaLink)        setCtaLink(String(cfg.ctaLink));

      // ── Timer source priority ──────────────────────────────────
      // 1. CMS config.endTime  (set from admin panel — the authoritative source)
      // 2. Earliest product flashSaleEnd  (per-product fallback)
      // 3. End of today  (last-resort fallback)
      let end: Date | null = null;

      if (cfg.endTime) {
        const d = new Date(String(cfg.endTime));
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

  if (!loading && products.length === 0) return null;

  return (
    <section className="w-full bg-white">

      {/* ── Red header bar ─────────────────────────────────────── */}
      <div className="bg-[#C1304B] px-4 py-2.5 sm:px-6">

        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none" aria-hidden>🏷️</span>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">{title}</h2>
          </div>
          <a
            href={ctaLink}
            className="flex items-center gap-0.5 text-white text-xs font-semibold hover:text-white/80 transition shrink-0"
          >
            {ctaText} <ChevronRight size={14} strokeWidth={2.5} />
          </a>
        </div>

        {/* Timer row */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-white text-[11px] font-semibold uppercase tracking-wide opacity-90">
            {timerLabel}
          </span>

          {saleEnded ? (
            <span className="text-white text-xs font-bold opacity-80">Sale ended</span>
          ) : loading ? (
            <div className="flex items-center gap-1 font-bold text-white opacity-60">
              {['--h','--m','--s'].map((lbl, i) => (
                <span key={i} className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{lbl}</span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 font-bold text-white">
              <span className="text-xs sm:text-sm bg-white/20 px-2 py-0.5 rounded">{fmt(timeLeft.hours)}h</span>
              <span className="text-xs">:</span>
              <span className="text-xs sm:text-sm bg-white/20 px-2 py-0.5 rounded">{fmt(timeLeft.minutes)}m</span>
              <span className="text-xs">:</span>
              <span className="text-xs sm:text-sm bg-white/20 px-2 py-0.5 rounded">{fmt(timeLeft.seconds)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Products (horizontal scroll) ──────────────────────── */}
      <div className="px-4 pt-3 pb-2 sm:px-6">
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[1,2,3].map((i) => (
              <div key={i} className="shrink-0 w-[calc(50vw-20px)] sm:w-56 aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"/>
            ))}
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {products.map((product) => (
              <div key={product.id} className="snap-start shrink-0 w-[calc(50vw-20px)] sm:w-56">
                <UnifiedProductCard product={product} className="w-full" imageStyle="contain" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Homepage categories grid ──────────────────────────── */}
      {!loading && categories.length > 0 && (
        <div className="px-4 py-3 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={cat.slug ? `/shop?categorySlug=${cat.slug}` : '/shop'}
                className="group relative overflow-hidden rounded-xl aspect-square cursor-pointer block"
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400"/>
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition"/>
                <div className="absolute inset-0 flex items-end justify-center pb-3 px-2">
                  <p className="text-white text-center font-semibold text-xs sm:text-sm leading-snug">
                    {cat.name}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

    </section>
  );
}
