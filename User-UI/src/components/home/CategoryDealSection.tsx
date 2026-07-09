import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface CategoryDealSectionProps {
  /** Section heading e.g. "Phone deals" */
  title: string;
  /** Optional subtitle e.g. "Up to 50% Off" */
  subtitle?: string;
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by category slug */
  categorySlug?: string;
  /** Header bar background color (default KRYROS primary) */
  headerBgColor?: string;
  /** Max products to show */
  productLimit?: number;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * CategoryDealSection
 *
 * A SEPARATE "deal" section (like Jumia's "Phone deals", "Appliances deals").
 * This is NOT the same as the category slider — this shows actual product cards
 * from a specific category in a horizontal scroll, with a full-width colored header.
 *
 * Add from Admin Panel: CMS → Dynamic Sections → Create New → Type: CategoryDeal
 * Set: title, categorySlug, headerBgColor, productLimit, ctaText, ctaLink
 */
export default function CategoryDealSection({
  title,
  subtitle,
  categoryId,
  categorySlug,
  headerBgColor = "#0A5858",
  productLimit = 8,
  ctaText = "See All",
  ctaLink = "/shop",
}: CategoryDealSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, unknown> = { take: productLimit + 4 };
    if (categoryId) params.categoryId = categoryId;
    if (categorySlug) params.categorySlug = categorySlug;
    if (!categoryId && !categorySlug) params.popularity = "bestseller";

    fetchProducts(params as Parameters<typeof fetchProducts>[0]).then((prods) => {
      setProducts(prods.slice(0, productLimit));
      setLoading(false);
    });
  }, [categoryId, categorySlug, productLimit]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="w-full bg-white">

      {/* ── Jumia Variant 3: Colored deal bar header ──────────── */}
      <div
        className="px-4 py-3 sm:px-6"
        style={{ backgroundColor: headerBgColor }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[20px] leading-[28px] font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="text-[13px] leading-[18px] text-white/90 mt-0.5">{subtitle}</p>
            )}
          </div>
          <a
            href={ctaLink}
            className="flex items-center gap-0.5 text-white text-[14px] font-semibold hover:text-white/80 transition shrink-0 whitespace-nowrap"
          >
            {ctaText} <ChevronRight size={16} strokeWidth={2.5} />
          </a>
        </div>
      </div>

      {/* ── Products (horizontal scroll) ──────────────────────── */}
      <div className="px-4 pt-3 pb-4 sm:px-6">
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-[calc(50vw-20px)] sm:w-48 aspect-[3/4] bg-muted rounded-lg animate-pulse"/>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar">
            {products.map((p) => (
              <div key={p.id} className="snap-start shrink-0 w-[calc(50vw-20px)] sm:w-48 md:w-52">
                <UnifiedProductCard product={p} className="w-full" imageStyle="contain" />
              </div>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}
