import { useState, useEffect, useRef } from 'react';
import { fetchCategories, ApiCategory } from '../../lib/api';
import { normalizePageContext, getScopedBrowsePath } from '@/lib/pageContext';
import { ChevronRight } from 'lucide-react';

interface CategorySectionProps {
  title?: string;
  subtitle?: string;
  layout?: 'grid' | 'horizontal-scroll';
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

export default function CategorySection({
  title = 'Shop by Category',
  subtitle,
  layout = 'grid',
  limit = 8,
  pageSlug = 'shop',
  titleAlign = 'left',
  showSeeAll = false,
  viewAllHref = '/categories',
  viewAllText = 'See All',
  accentColor,
  textColor,
  headerBgColor
}: CategorySectionProps) {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // Prefer top-level categories; fall back to all if none
        const topLevel = list.filter((c: any) => !c.parentId);
        setCategories((topLevel.length > 0 ? topLevel : list).slice(0, limit));
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [limit]);

  // Auto-scroll effect for horizontal-scroll layout
  useEffect(() => {
    if (layout !== 'horizontal-scroll' || !scrollRef.current || categories.length === 0 || isPaused) return;

    const scrollContainer = scrollRef.current;
    const scrollAmount = 100; // Width of one category card + gap
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
  }, [categories, layout, isPaused]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {title && <div className="h-7 w-48 bg-muted animate-pulse rounded-lg mb-4" />}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-14 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  const CategoryCard = ({ cat }: { cat: ApiCategory }) => {
    const href = getScopedBrowsePath(normalizePageContext(pageSlug), 'category', cat.slug || String(cat.id));

    return (
      <a href={href} className="group flex flex-col items-center text-center">
        <div className="w-full aspect-square overflow-hidden rounded-xl bg-muted/60">
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {cat.name}
        </p>
      </a>
    );
  };

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
      {layout === 'horizontal-scroll' ? (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {categories.map((cat) => (
            <div key={cat.id} className="flex-shrink-0 w-[100px] snap-start">
              <CategoryCard cat={cat} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </div>
      )}
    </section>
  );
}
