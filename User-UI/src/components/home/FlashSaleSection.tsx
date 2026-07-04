import { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { fetchFlashSaleProducts, fetchHomepageCategories } from '@/lib/api';
import type { Product, ApiCategory } from '@/lib/api';
import UnifiedProductCard from '@/components/UnifiedProductCard';

// ─── Timer helpers ────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export default function FlashSaleSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [saleEnded, setSaleEnded] = useState(false);
  const endDateRef = useRef<Date | null>(null);

  // ── Fetch flash-sale products + homepage categories on mount ─────────────
  useEffect(() => {
    Promise.all([
      fetchFlashSaleProducts(),
      fetchHomepageCategories(),
    ]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);

      // Derive end date from the earliest flashSaleEnd across all products
      const timestamps = prods
        .filter((p) => p.flashSaleEnd)
        .map((p) => new Date(p.flashSaleEnd!).getTime());

      let end: Date;
      if (timestamps.length > 0) {
        end = new Date(Math.min(...timestamps));
      } else {
        // Fallback: end of today if no explicit end date is set
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

  // ── Live countdown tick ──────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !endDateRef.current) return;

    const tick = setInterval(() => {
      const secs = secondsUntil(endDateRef.current!);
      setTimeLeft(decompose(secs));
      if (secs === 0) {
        setSaleEnded(true);
        clearInterval(tick);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [loading]);

  const fmt = (v: number) => String(v).padStart(2, '0');

  // Hide section entirely when there are no active flash-sale products
  if (!loading && products.length === 0) return null;

  return (
    <section className="w-full bg-white">

      {/* ── Red header bar ─────────────────────────────────────────────── */}
      <div className="bg-[#C1304B] px-4 py-4 sm:px-6 lg:px-8">

        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl" aria-hidden>🏷️</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Flash Sales</h2>
          </div>
          <a
            href="/shop?isFlashSale=true"
            className="flex items-center gap-1 text-white hover:text-gray-100 transition text-sm sm:text-base font-medium"
          >
            See All <ChevronRight size={20} />
          </a>
        </div>

        {/* Timer row */}
        <div className="mt-3 flex items-center gap-2 sm:gap-3">
          <span className="text-white text-sm sm:text-base font-medium">TIME LEFT:</span>

          {saleEnded ? (
            <span className="text-white text-sm font-bold opacity-80">Sale ended</span>
          ) : loading ? (
            /* Skeleton while data loads */
            <div className="flex items-center gap-1 sm:gap-2 font-bold">
              {['--h', '--m', '--s'].map((lbl, i) => (
                <span key={i} className="text-white text-lg sm:text-xl bg-white/20 px-2 sm:px-3 py-1 rounded opacity-60">
                  {lbl}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 font-bold">
              <span className="text-white text-lg sm:text-xl bg-white/20 px-2 sm:px-3 py-1 rounded">
                {fmt(timeLeft.hours)}h
              </span>
              <span className="text-white">:</span>
              <span className="text-white text-lg sm:text-xl bg-white/20 px-2 sm:px-3 py-1 rounded">
                {fmt(timeLeft.minutes)}m
              </span>
              <span className="text-white">:</span>
              <span className="text-white text-lg sm:text-xl bg-white/20 px-2 sm:px-3 py-1 rounded">
                {fmt(timeLeft.seconds)}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Flash-sale products (horizontal scroll) ────────────────────── */}
      <div className="px-4 pt-4 pb-2 sm:px-6 lg:px-8">
        {loading ? (
          /* Loading skeleton */
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[calc(50vw-20px)] sm:w-56 aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="snap-start shrink-0 w-[calc(50vw-20px)] sm:w-56"
              >
                <UnifiedProductCard
                  product={product}
                  className="w-full"
                  imageStyle="contain"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Homepage categories grid ───────────────────────────────────── */}
      {!loading && categories.length > 0 && (
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={cat.slug ? `/shop?categorySlug=${cat.slug}` : '/shop'}
                className="group relative overflow-hidden rounded-lg aspect-square cursor-pointer block"
              >
                {/* Category image */}
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400" />
                )}

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition" />

                {/* Category name */}
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <p className="text-white text-center font-semibold text-sm sm:text-base leading-snug">
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
