import { useState, useEffect } from "react";
import { Link } from "wouter";
import { API_BASE } from "@/lib/api";

/**
 * CategoryGridShelf Component
 * 
 * A reusable component for displaying product categories in a grid.
 * It fetches categories based on a dataSourceId and renders them dynamically.
 * 
 * This replaces the hardcoded HomepageCategoryGrid component.
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
  dataSourceId: string; // e.g., 'homepage-categories', 'shop-page-categories'
  limit?: number;
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
        // Fetch categories by data source
        const url = new URL(`${API_BASE}/api/cms/sections/categories-by-source`);
        url.searchParams.set('dataSourceId', dataSourceId);
        url.searchParams.set('limit', String(limit));

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }

        const data = await response.json();
        const categoryList = Array.isArray(data) ? data : (data.data || []);
        setCategories(categoryList.slice(0, limit));
      } catch (err) {
        console.error(`Error fetching categories for data source '${dataSourceId}':`, err);
        setError(err instanceof Error ? err.message : 'Failed to load categories');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [dataSourceId, limit]);

  // Don't render if no categories
  if (!loading && categories.length === 0) {
    return null;
  }

  // Determine grid columns
  const gridColsClass =
    columns === 'auto'
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : `grid-cols-${columns} md:grid-cols-${columns} lg:grid-cols-${columns}`;

  return (
    <section className={`pb-4 md:pb-6 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Section header (optional) */}
        {(title || subtitle) && (
          <div className="px-4 md:px-6 pt-4 pb-3">
            {title && <h2 className="text-xl font-bold text-foreground">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className={`px-4 md:px-6 grid gap-3 ${gridColsClass}`}>
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className="bg-muted rounded-2xl animate-pulse"
                style={{ aspectRatio: '1/1' }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 md:px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          /* Category grid */
          <div className={`px-4 md:px-6 grid gap-3 ${gridColsClass}`}>
            {categories.map((category) => (
              <Link key={category.id} href={`/shop?category=${category.slug}`}>
                <div className="group cursor-pointer">
                  <div className="relative w-full bg-muted rounded-2xl overflow-hidden mb-2">
                    {(category.image || category.imageUrl) ? (
                      <img
                        src={category.image || category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {category.icon || '📦'}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  {showProductCount && category.productCount !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {category.productCount} products
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* View All button (optional) */}
        {showViewAll && (
          <div className="px-4 md:px-6 pt-4 text-center">
            <Link href={viewAllHref}>
              <span className="text-primary font-semibold cursor-pointer hover:underline">
                View All Categories
              </span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
