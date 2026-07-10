import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { fetchHomepageCategories } from "@/lib/api";
import type { ApiCategory } from "@/lib/api";

const GRID_LIMIT = 8;

function CategoryCard({ cat }: { cat: ApiCategory }) {
  const href = `/shop/section/${encodeURIComponent(cat.slug || cat.id)}`;
  return (
    <Link href={href}>
      <a className="flex flex-col items-center gap-2 group cursor-pointer select-none">
        {/* Square image */}
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
                className="w-8 h-8 text-primary/30"
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
        {/* Name */}
        <span className="text-center text-[11px] sm:text-xs font-semibold text-foreground leading-tight line-clamp-2 px-0.5 w-full">
          {cat.name}
        </span>
      </a>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center gap-2 animate-pulse">
      <div className="w-full aspect-square rounded-xl bg-muted" />
      <div className="h-3 w-4/5 bg-muted rounded mx-auto" />
    </div>
  );
}

/**
 * HomepageCategoryGrid
 * Displays up to 8 categories in a 4×2 grid (Jumia-style),
 * placed after the Flash Sale section on the homepage.
 *
 * Category priority:
 *   1. Manually pinned (showOnHome = true) — always shown first.
 *   2. Auto-filled by product count — fills remaining slots up to 8.
 */
export default function HomepageCategoryGrid() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomepageCategories()
      .then((cats) => setCategories(cats.slice(0, GRID_LIMIT)))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && categories.length === 0) return null;

  return (
    <section className="py-5 bg-background">
      <div className="px-3 sm:px-4 md:px-6 max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                Shop By Category
              </h2>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Browse our top categories
              </p>
            </div>
          </div>
          <Link href="/categories">
            <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap">
              See All <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {/* 4×2 Grid */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {loading
            ? Array.from({ length: GRID_LIMIT }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : categories.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
        </div>

        {/* "See All Categories" CTA */}
        {!loading && categories.length > 0 && (
          <div className="mt-5 flex justify-center">
            <Link href="/categories">
              <a className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                See All Categories
                <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
