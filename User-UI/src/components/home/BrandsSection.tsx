import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { inferPageContext, getScopedBrowsePath } from "@/lib/pageContext";

interface CmsBrand {
  name: string;
  logo: string;
  shopSlug: string;
}

interface BrandsSectionProps {
  title?: string;
  subtitle?: string;
  displayMode?: 'full' | 'minimal';
  autoScroll?: boolean;
  dataSourceId?: string;
}

export default function BrandsSection({
  title,
  subtitle,
  displayMode = 'full',
  autoScroll = true,
  dataSourceId = 'generic-brand-section'
}: BrandsSectionProps) {
  const [location] = useLocation();
  const pageContext = useMemo(() => inferPageContext(location), [location]);
  const [brands, setBrands] = useState<CmsBrand[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<1 | -1>(1);
  const animRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await api.get(`/api/cms/sections/brands-by-source?dataSourceId=${dataSourceId}`);
        if (response.data && response.data.length > 0) {
          setBrands(response.data.map((b: any) => ({
            name: b.name || "",
            logo: b.logo || "",
            shopSlug: b.slug || b.name?.toLowerCase().replace(/\s+/g, "-") || "",
          })));
          return;
        }
      } catch (err) {
        console.warn("No brands returned from CMS");
      }
    };

    fetchBrands();
  }, [dataSourceId]);

  // Auto-scroll logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || brands.length === 0 || !autoScroll) return;

    const SPEED = 0.03;
    const tick = (time: number) => {
      if (pausedRef.current) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = Math.min(time - lastTimeRef.current, 50);
      lastTimeRef.current = time;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        if (el.scrollLeft >= maxScroll - 1) dirRef.current = -1;
        if (el.scrollLeft <= 1) dirRef.current = 1;
        el.scrollLeft += dirRef.current * SPEED * delta;
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; lastTimeRef.current = 0; };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    return () => {
      cancelAnimationFrame(animRef.current);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, [brands, autoScroll]);

  if (brands.length === 0) return null;

  const handleBrandClick = (brand: CmsBrand) => {
    window.location.href = getScopedBrowsePath(pageContext, 'brand', brand.shopSlug);
  };

  return (
    <section className="py-5 md:py-6 border-t border-border bg-white">
      <div className="px-4 md:px-6 max-w-7xl mx-auto">
        {(title || subtitle) && (
          <div className="mb-4">
            {title && <h2 className="text-xl font-bold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        
        <div
          ref={scrollRef}
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {brands.map((brand, i) => (
            <button
              key={i}
              onClick={() => handleBrandClick(brand)}
              className={`flex-shrink-0 border border-border rounded-xl flex flex-col items-center justify-center hover:border-primary/40 hover:shadow-md transition-all cursor-pointer px-4 py-2.5 min-w-[80px] md:min-w-[100px] gap-1.5 ${displayMode === 'minimal' ? 'bg-transparent border-none py-1 px-2 min-w-0' : 'bg-card'}`}
            >
              {brand.logo && displayMode !== 'minimal' ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-w-[56px] max-h-[32px] md:max-w-[64px] md:max-h-[36px] object-contain"
                  loading="lazy"
                />
              ) : (
                <span className={`text-xs md:text-sm font-bold text-foreground leading-tight whitespace-nowrap ${displayMode === 'minimal' ? 'text-muted-foreground hover:text-primary transition-colors py-1' : ''}`}>
                  {brand.name}
                </span>
              )}
              {displayMode !== 'minimal' && (
                <span className="text-[10px] font-semibold text-muted-foreground leading-none">{brand.name}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
