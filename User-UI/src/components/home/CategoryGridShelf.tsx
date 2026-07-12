import { useState, useEffect } from "react";
import { Link } from "wouter";
import { API_BASE } from "@/lib/api";

/**
 * CategoryGridShelf Component
 * 
 * A reusable component for displaying product categories in a grid or horizontal scroll.
 */

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  imageUrl?: string;
  icon?: string;
  productCount?: number;
}

interface CategoryGridShelfProps {
  title?: string;
  subtitle?: string;
  dataSourceId: string;
  limit?: number;
  layout?: 'grid' | 'horizontal' | 'horizontal-scroll';
  columns?: 'auto' | 2 | 3 | 4 | 5 | 6;
  showProductCount?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  className?: string;
}

export default function CategoryGridShelf({
  title,
  subtitle,
  dataSourceId,
  limit = 12,
  layout = 'grid',
  columns = 'auto',
  showProductCount = false,
  showViewAll = false,
  viewAllHref = '/shop',
  className = ""
}: CategoryGridShelfProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = new URL(`${API_BASE}/api/cms/sections/categories-by-source`);
        url.searchParams.set('dataSourceId', dataSourceId);
        url.searchParams.set('limit', String(limit));

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Failed to fetch categories`);

        const data = await response.json();
        const categoryList = Array.isArray(data) ? data : (data.data || []);
        setCategories(categoryList.slice(0, limit));
      } catch (err) {
        console.error(err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [dataSourceId, limit]);

  if (!loading && categories.length === 0) return null;

  const isHorizontal = layout === 'horizontal' || layout === 'horizontal-scroll';

  // Grid columns logic
  const gridColsClass = columns === 'auto'
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    : `grid-cols-${columns}`;

  return (
    <section className={`pb-4 md:pb-6 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto">
        {(title || subtitle) && (
          <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3">
            <div className="min-w-0">
              {title && <h2 className="text-[20px] leading-[28px] font-bold text-foreground tracking-tight">{title}</h2>}
              {subtitle && <p className="text-[13px] leading-[18px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {showViewAll && (
              <Link href={viewAllHref}>
                <span className="text-[14px] font-semibold text-primary hover:underline cursor-pointer">
                  See All
                </span>
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <div className={`px-4 md:px-6 ${isHorizontal ? 'flex gap-3 overflow-hidden' : `grid gap-3 ${gridColsClass}`}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${isHorizontal ? 'shrink-0 w-32 md:w-40' : 'w-full'} aspect-square bg-muted rounded-2xl animate-pulse`}
              />
            ))}
          </div>
        ) : (
          <div className={`px-4 md:px-6 ${isHorizontal ? 'flex gap-3 overflow-x-auto no-scrollbar pb-2' : `grid gap-3 ${gridColsClass}`}`}>
            {categories.map((category) => (
              <Link key={category.id} href={`/shop?category=${category.slug}`}>
                <div className={`group cursor-pointer ${isHorizontal ? 'shrink-0 w-32 md:w-40' : 'w-full'}`}>
                  <div className="relative w-full aspect-square bg-muted rounded-2xl overflow-hidden mb-2">
                    {(category.image || category.imageUrl) ? (
                      <img
                        src={category.image || category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        {category.icon || '📦'}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground text-center group-hover:text-primary transition-colors line-clamp-1">
                    {category.name}
                  </h3>
                  {showProductCount && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      {category.productCount || 0} Products
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
