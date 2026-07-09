import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { fetchProducts, fetchHomepageSections } from "@/lib/api";
import type { Product, ApiHomepageSection } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface LimitedStockDealSectionProps {
  title?: string;
  discountText?: string;
  discountPercent?: number;
  productLimit?: number;
  ctaText?: string;
  ctaLink?: string;
  /** Header background color (default: KRYROS primary #0A5858) */
  headerBgColor?: string;
}

export default function LimitedStockDealSection({
  title: propTitle,
  discountText: propDiscountText,
  discountPercent: propDiscountPercent,
  productLimit: propProductLimit,
  ctaText: propCtaText,
  ctaLink: propCtaLink,
  headerBgColor: propHeaderBgColor,
}: LimitedStockDealSectionProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmsTitle, setCmsTitle] = useState("Limited Stock deals");
  const [cmsDiscountLabel, setCmsDiscountLabel] = useState("Up to 70% Off");
  const [cmsCtaText, setCmsCtaText] = useState("See All");
  const [cmsCtaLink, setCmsCtaLink] = useState("/shop");
  const [cmsBgColor, setCmsBgColor] = useState("#0A5858");
  const [cmsLimit, setCmsLimit] = useState(8);

  const title         = propTitle        ?? cmsTitle;
  const discountLabel = propDiscountText ?? (propDiscountPercent ? `Up to ${propDiscountPercent}% Off` : cmsDiscountLabel);
  const ctaText       = propCtaText      ?? cmsCtaText;
  const ctaLink       = propCtaLink      ?? cmsCtaLink;
  const headerBg      = propHeaderBgColor ?? cmsBgColor;
  const limit         = propProductLimit  ?? cmsLimit;

  useEffect(() => {
    Promise.all([
      fetchProducts({ popularity: "bestseller", take: 12 }),
      fetchHomepageSections("LimitedStockDeal"),
    ]).then(([prods, sections]) => {
      setProducts(prods.slice(0, 12));

      const cms = sections.find((s: ApiHomepageSection) => s.type === "LimitedStockDeal");
      const cfg = (cms?.config ?? {}) as Record<string, unknown>;

      if (cfg.title)       setCmsTitle(String(cfg.title));
      if (cfg.headerBgColor) setCmsBgColor(String(cfg.headerBgColor));
      if (cfg.discountText) {
        setCmsDiscountLabel(String(cfg.discountText));
      } else if (cfg.discountPercent) {
        setCmsDiscountLabel(`Up to ${Number(cfg.discountPercent) || 70}% Off`);
      }
      if (cfg.ctaText)     setCmsCtaText(String(cfg.ctaText));
      if (cfg.ctaLink)     setCmsCtaLink(String(cfg.ctaLink));
      if (cfg.limit)       setCmsLimit(Number(cfg.limit) || 8);
      if (cfg.productLimit) setCmsLimit(Number(cfg.productLimit) || 8);

      setLoading(false);
    });
  }, []);

  const displayProducts = products.slice(0, limit);
  if (!loading && displayProducts.length === 0) return null;

  return (
    <section className="w-full bg-white">

      {/* ── Jumia Variant 3: Colored bar — title + discount subtitle + See All ── */}
      <div
        className="px-4 py-3 sm:px-6"
        style={{ backgroundColor: headerBg }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[20px] leading-[28px] font-bold text-white">{title}</h2>
            <p className="text-[13px] leading-[18px] text-white/90 mt-0.5">{discountLabel}</p>
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
            {displayProducts.map((p) => (
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
