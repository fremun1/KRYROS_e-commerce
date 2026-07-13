import { useState, useEffect, useRef } from 'react';
import { fetchCategories, ApiCategory } from '../../lib/api';

interface CategorySectionProps {
  title?: string;
  layout?: 'grid' | 'horizontal-scroll';
  limit?: number;
}

export default function CategorySection({
  title = 'Shop by Category',
  layout = 'grid',
  limit = 8,
}: CategorySectionProps) {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories()
      .then(cats => {
        const active = cats.filter(c => c.isActive !== false);
        setCategories(active.slice(0, limit));
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {title && <div className="h-7 w-48 bg-muted animate-pulse rounded-lg mb-4" />}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 flex flex-col items-center gap-2"
            >
              <div className="w-full aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  const CategoryCard = ({ cat }: { cat: ApiCategory }) => {
    const href = cat.slug
      ? `/shop?categorySlug=${cat.slug}`
      : `/shop?categoryId=${cat.id}`;

    return (
      <a href={href} className="group flex flex-col items-center text-center">
        {/* Image container */}
        <div
          className={`
            w-full overflow-hidden rounded-xl bg-muted/60
            aspect-square
          `}
        >
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/40 select-none">
              {cat.icon || (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Name */}
        <p className="mt-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {cat.name}
        </p>
      </a>
    );
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Section header */}
      {title && (
        <h2 className="text-xl font-bold mb-4 text-foreground">{title}</h2>
      )}

      {layout === 'horizontal-scroll' ? (
        /* ── Horizontal scroll ── */
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map(cat => (
            <div key={cat.id} className="flex-shrink-0 w-[100px] snap-start">
              <CategoryCard cat={cat} />
            </div>
          ))}
        </div>
      ) : (
        /* ── Grid layout ── */
        <div className="grid grid-cols-4 gap-2">
          {categories.map(cat => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </div>
      )}
    </section>
  );
}
