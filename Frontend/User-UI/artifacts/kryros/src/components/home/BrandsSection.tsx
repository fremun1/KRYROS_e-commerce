import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface CmsBrand {
  name: string;
  logo: string;       // uploaded image URL or base64
  shopSlug: string;   // brand slug for /shop#brand-{shopSlug} scroll
}

export default function BrandsSection() {
  const [brands, setBrands] = useState<CmsBrand[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/cms/site-config/trusted-brands`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        const v = d?.value;
        const raw: any[] = Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
        if (raw.length > 0) {
          setBrands(raw.map((b: any) => ({
            name: b.name || "",
            logo: b.logo || "",
            shopSlug: b.shopSlug || b.slug || b.name?.toLowerCase().replace(/\s+/g, "-") || "",
          })));
        }
      })
      .catch(() => {});
  }, []);

  if (brands.length === 0) return null;

  const handleBrandClick = (brand: CmsBrand) => {
    // Navigate to shop page and open that brand panel
    window.location.href = `/shop#brand-${brand.shopSlug}`;
  };

  return (
    <section className="py-5 md:py-6 border-t border-border">
      <div className="px-4 md:px-6 max-w-7xl mx-auto">
        <h2 className="text-base md:text-xl font-black text-foreground mb-4">Top Brands</h2>

        {/* Unified horizontal sliding carousel — mobile & desktop */}
        <div
          className="flex items-center gap-2.5 overflow-x-auto scroll-smooth pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {brands.map((brand, i) => (
            <button
              key={i}
              onClick={() => handleBrandClick(brand)}
              className="flex-shrink-0 bg-card border border-border rounded-xl flex flex-col items-center justify-center hover:border-primary/40 hover:shadow-md transition-all cursor-pointer px-4 py-2.5 min-w-[80px] md:min-w-[100px] gap-1.5"
            >
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-w-[56px] max-h-[32px] md:max-w-[64px] md:max-h-[36px] object-contain"
                  loading="lazy" decoding="async"
                />
              ) : (
                <span className="text-xs md:text-sm font-bold text-foreground leading-tight whitespace-nowrap">{brand.name}</span>
              )}
              <span className="text-[10px] font-semibold text-muted-foreground leading-none">{brand.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
