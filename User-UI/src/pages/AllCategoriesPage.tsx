import { useState, useEffect } from "react";
  import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { fetchCategories } from "@/lib/api";
import type { ApiCategory } from "@/lib/api";
import { inferPageContext, getScopedBrowsePath, getPageContextDisplayPath } from "@/lib/pageContext";

function CategoryCard({ cat, pageContext }: { cat: ApiCategory; pageContext: any }) {
  const href = getScopedBrowsePath(pageContext, 'category', cat.slug || cat.id);
  return (
    <Link href={href}>
      <a className="flex flex-col items-center gap-2 group cursor-pointer select-none">
        <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 shadow-sm">
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <svg
                className="w-7 h-7 text-primary/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </div>
          )}
        </div>
        <span className="text-center text-[10px] sm:text-xs font-semibold text-foreground leading-tight line-clamp-2 px-0.5 w-full">
          {cat.name}
        </span>
      </a>
    </Link>
  );
}

/**
 * AllCategoriesPage
 * Inner page that shows every active category in a responsive grid.
 * Accessible via: /categories
 * Linked from: HomepageCategoryGrid "See All Categories" button.
 */
export default function AllCategoriesPage() {
  const [location] = useLocation();
  const pageContext = inferPageContext(location);
  const displayBasePath = getPageContextDisplayPath(pageContext);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        const active = cats
          .filter((c) => c.isActive !== false)
          .sort((a, b) => {
            const so = (a as any).sortOrder ?? 0;
            const sb = (b as any).sortOrder ?? 0;
            if (so !== sb) return so - sb;
            return a.name.localeCompare(b.name);
          });
        setCategories(active);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href={displayBasePath}>
          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="font-black text-base text-foreground leading-tight">
            All Categories
          </h1>
          {!loading && (
            <p className="text-[10px] text-muted-foreground">
              {categories.length} {categories.length === 1 ? "category" : "categories"}
            </p>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-4 py-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 animate-pulse"
                >
                  <div className="w-full aspect-square rounded-xl bg-muted" />
                  <div className="h-3 w-4/5 bg-muted rounded mx-auto" />
                </div>
              ))
            : categories.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} pageContext={pageContext} />
              ))}
        </div>

        {!loading && categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <svg
              className="w-12 h-12 mb-3 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-sm font-medium">No categories available</p>
            <p className="text-xs mt-1">Check back soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
