import { useState, useEffect, useRef } from 'react';
import { fetchBrands, ApiBrand } from '../../lib/api';
import { normalizePageContext, getScopedBrowsePath } from '@/lib/pageContext';

import { ChevronRight } from 'lucide-react';

interface BrandSectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  pageSlug?: string;

  // Layout control
  titleAlign?: 'left' | 'center' | 'right';
  showSeeAll?: boolean;
  viewAllHref?: string;
  viewAllText?: string;
  accentColor?: string;
  textColor?: string;
  headerBgColor?: string;
}

export default function BrandSection({
  title = 'Top Brands',
  subtitle,
  limit = 12,
  pageSlug = 'shop',
  titleAlign = 'left',
  showSeeAll = false,
  viewAllHref = '/brands',
  viewAllText = 'See All',
  accentColor,
  textColor,
  headerBgColor
}: BrandSectionProps) {
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedLogos, setFailedLogos] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetchBrands()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const deduped = Array.from(
          list.reduce((map, brand) => {
            const key = brand.name.trim().toLowerCase();
            const existing = map.get(key);

            if (!existing) {
              map.set(key, brand);
              return map;
            }

            if (!existing.logo && brand.logo) {
              map.set(key, brand);
            }

            return map;
          }, new Map<string, ApiBrand>()).values()
        );

        setFailedLogos({});
        setBrands(deduped.slice(0, limit));
      })
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, [limit]);

  // Auto-scroll effect
  useEffect(() => {
    if (!scrollRef.current || brands.length === 0 || isPaused) return;

    const scrollContainer = scrollRef.current;
    const scrollAmount = 100; // Width of one brand card + gap
    const scrollInterval = 3000; // 3 seconds

    const intervalId = setInterval(() => {
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
        // Reset to start when reaching the end
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, scrollInterval);

    return () => clearInterval(intervalId);
  }, [brands, isPaused]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {title && <div className="h-7 w-48 bg-muted animate-pulse rounded-lg mb-4" />}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[100px] flex flex-col items-center gap-2">
              <div className="w-full aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-14 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) return null;

  const hrefFor = (brand: ApiBrand) =>
    getScopedBrowsePath(normalizePageContext(pageSlug), 'brand', brand.slug || String(brand.id));

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-6">
      {title && (
        <div
          className={
            titleAlign === 'center'
              ? `flex flex-col items-center justify-center text-center py-4 gap-2 ${headerBgColor ? 'mb-4 px-4 md:px-6' : 'mb-4'}`
              : titleAlign === 'right'
              ? `flex flex-row-reverse items-center justify-between py-3 ${headerBgColor ? 'mb-4 px-4 md:px-6' : 'mb-4'}`
              : `flex items-center justify-between py-3 ${headerBgColor ? 'mb-4 px-4 md:px-6' : 'mb-4'}`
          }
          style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
        >
          <div className={
            titleAlign === 'center'
              ? 'flex flex-col items-center justify-center text-center min-w-0'
              : titleAlign === 'right'
              ? 'text-right min-w-0'
              : 'min-w-0'
          }>
            <h2
              className="text-xl font-bold tracking-tight text-foreground"
              style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
            >
              {title}
            </h2>
            {subtitle && (
              <p className={`text-[13px] leading-[18px] mt-0.5 ${headerBgColor ? 'text-white/80' : 'text-muted-foreground'} ${titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left'}`}>
                {subtitle}
              </p>
            )}
          </div>

          {showSeeAll && (
            <a
              href={viewAllHref}
              className={`flex items-center gap-0.5 text-[14px] font-semibold hover:opacity-80 transition-colors shrink-0 whitespace-nowrap ${titleAlign === 'center' ? 'mt-2' : titleAlign === 'right' ? 'mr-4' : 'ml-4'}`}
              style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
            >
              {viewAllText}
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </a>
          )}
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex flex-nowrap gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {brands.map((brand) => (
          <a
            key={brand.id}
            href={hrefFor(brand)}
            className="flex-shrink-0 w-[100px] snap-start group flex flex-col items-center text-center"
          >
            <div className="w-full aspect-square overflow-hidden rounded-xl bg-muted/60 flex items-center justify-center p-2 group-hover:bg-muted/80 transition-colors">
              {brand.logo && !failedLogos[brand.id] ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={() =>
                    setFailedLogos((prev) => ({ ...prev, [brand.id]: true }))
                  }
                />
              ) : (
                <span className="text-[11px] font-bold text-foreground/70 text-center leading-tight px-1 line-clamp-3">
                  {brand.name}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {brand.name}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
