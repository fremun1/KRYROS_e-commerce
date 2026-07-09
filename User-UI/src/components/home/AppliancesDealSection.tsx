import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { fetchProducts, fetchHomepageSections, fetchCategories } from "@/lib/api";
import type { Product, ApiHomepageSection, ApiCategory } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface AppliancesDealSectionProps {
  title?: string;
  subtitleText?: string;
  ctaText?: string;
  ctaLink?: string;
  headerBgColor?: string;
  productLimit?: number;
  categorySlug?: string;
}

export default function AppliancesDealSection({
  title: propTitle,
  subtitleText: propSubtitleText,
  ctaText: propCtaText,
  ctaLink: propCtaLink,
  headerBgColor: propHeaderBgColor,
  productLimit: propProductLimit,
  categorySlug: propCategorySlug,
}: AppliancesDealSectionProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmsTitle, setCmsTitle]       = useState("Appliances deals");
  const [cmsSubtitle, setCmsSubtitle] = useState("");
  const [cmsCtaText, setCmsCtaText]   = useState("See All");
  const [cmsCtaLink, setCmsCtaLink]   = useState("/shop");
  const [cmsBgColor, setCmsBgColor]   = useState("#0A5858");
  const [cmsLimit, setCmsLimit]       = useState(8);

  const title     = propTitle          ?? cmsTitle;
  const subtitle  = propSubtitleText   ?? cmsSubtitle;
  const ctaText   = propCtaText        ?? cmsCtaText;
  const ctaLink   = propCtaLink        ?? cmsCtaLink;
  const headerBg  = propHeaderBgColor  ?? cmsBgColor;
  const limit     = propProductLimit   ?? cmsLimit;

  useEffect(() => {
    const load = async () => {
      // 1. Try CMS config first
      const sections = await fetchHomepageSections("AppliancesDeal");
      const cms = sections.find((s: ApiHomepageSection) => s.type === "AppliancesDeal");
      const cfg = (cms?.config ?? {}) as Record<string, unknown>;

      if (cfg.title)       setCmsTitle(String(cfg.title));
      if (cfg.subtitle)    setCmsSubtitle(String(cfg.subtitle));
      if (cfg.headerBgColor) setCmsBgColor(String(cfg.headerBgColor));
      if (cfg.ctaText)     setCmsCtaText(String(cfg.ctaText));
      if (cfg.ctaLink)     setCmsCtaLink(String(cfg.ctaLink));
      if (cfg.limit)       setCmsLimit(Number(cfg.limit) || 8);
      if (cfg.productLimit) setCmsLimit(Number(cfg.productLimit) || 8);

      // 2. Fetch products — prop slug → CMS slug → auto-detect appliances
      const targetSlug = propCategorySlug || (cfg.categorySlug ? String(cfg.categorySlug) : null);
      let prods: Product[] = [];

      if (targetSlug) {
        prods = await fetchProducts({ categorySlug: targetSlug, take: 12 });
      }

      if (prods.length === 0) {
        const allCategories = await fetchCategories();
        const matchKeywords = ["appliance", "home appliance", "kitchen", "washing", "fridge", "refrigerator", "microwave", "cooker", "oven", "iron", "fan", "blender", "toaster", "heater", "ac", "air conditioner", "vacuum"];
        const applianceSlugs: string[] = [];
        allCategories.forEach((cat: ApiCategory) => {
          const nameLower = cat.name.toLowerCase();
          if (matchKeywords.some((kw) => nameLower.includes(kw)) && cat.slug) {
            applianceSlugs.push(cat.slug);
          }
        });
        if (applianceSlugs.length > 0) {
          prods = await fetchProducts({ categorySlug: applianceSlugs[0], take: 12 });
        }
      }

      if (prods.length === 0) {
        prods = await fetchProducts({ popularity: "bestseller", take: 12 });
      }

      setProducts(prods.slice(0, 12));
      setLoading(false);
    };
    load();
  }, []);

  const displayProducts = products.slice(0, limit);
  if (!loading && displayProducts.length === 0) return null;

  return (
    <section className="w-full bg-white">

      {/* ── Jumia Variant 3: Deal colored bar header ─────────── */}
      <div
        className="px-4 py-3 sm:px-6"
        style={{ backgroundColor: headerBg }}
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
