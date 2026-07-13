import { useState, useEffect } from 'react';
import { fetchBrands, ApiBrand } from '../../lib/api';

interface BrandSectionProps {
  title?: string;
  limit?: number;
}

export default function BrandSection({
  title = 'Top Brands',
  limit = 8,
}: BrandSectionProps) {
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands()
      .then((data) => {
        const active = Array.isArray(data)
          ? data.filter((b: ApiBrand) => b.logo)
          : [];
        setBrands(active.slice(0, limit));
      })
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {title && <div className="h-7 w-48 bg-muted animate-pulse rounded-lg mb-4" />}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 flex flex-col items-center gap-2">
              <div className="w-full aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) return null;

  const hrefFor = (brand: ApiBrand) =>
    brand.slug ? `/shop?brandSlug=${brand.slug}` : `/shop?brandId=${brand.id}`;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-6">
      {title && <h2 className="text-xl font-bold mb-4 text-foreground">{title}</h2>}

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {brands.map((brand) => (
          <a key={brand.id} href={hrefFor(brand)}
            className="flex-shrink-0 w-[100px] snap-start group flex flex-col items-center text-center">
            <div className="w-full aspect-square overflow-hidden rounded-xl bg-muted/60 flex items-center justify-center p-3 group-hover:bg-muted/80 transition-colors">
              <img
                src={brand.logo}
                alt={brand.name}
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {brand.name}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
