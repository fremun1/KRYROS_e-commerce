import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";

interface PromoBanner {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
  overlayFrom: string;
  overlayTo: string;
}

const OVERLAYS = [
  { from: "rgba(5,30,22,0.88)", to: "rgba(5,30,22,0.25)" },
  { from: "rgba(5,20,40,0.88)", to: "rgba(5,20,40,0.25)" },
];

function homepageSectionToPromo(sec: ApiHomepageSection, index: number): PromoBanner | null {
  const cfg = (sec.config || {}) as Record<string, string>;
  // Only show if admin has configured a background image
  const image = cfg.image || cfg.media || "";
  if (!image) return null;
  const o = OVERLAYS[index % OVERLAYS.length];
  return {
    id: sec.id,
    tag: cfg.tag || "",
    title: cfg.title || "",
    subtitle: cfg.subtitle || "",
    cta: cfg.cta || cfg.button_text || "Learn More",
    href: cfg.href || cfg.link || cfg.button_link || "/shop",
    image,
    overlayFrom: o.from,
    overlayTo: o.to,
  };
}

export default function PromoBanners() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomepageSections("PromoBanners")
      .then((sections) => {
        const mapped = sections
          .slice(0, 2)
          .map((s, i) => homepageSectionToPromo(s, i))
          .filter((b): b is PromoBanner => b !== null);
        setBanners(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-4 md:py-6">
        <div className="px-3 md:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl animate-pulse bg-muted" style={{ height: 150 }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (banners.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="px-3 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {banners.map((b) => (
            <div key={b.id} className="relative rounded-2xl overflow-hidden" style={{ height: 150 }}>
              <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" decoding="async" />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to right, ${b.overlayFrom} 0%, ${b.overlayTo} 70%, transparent 100%)` }}
              />
              <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
                {b.tag && (
                  <span className="self-start text-[9px] font-black tracking-wider text-white/90 bg-white/15 px-2 py-0.5 rounded-full">
                    {b.tag}
                  </span>
                )}
                <div>
                  {b.title && (
                    <h3 className="text-white font-black text-[15px] leading-tight drop-shadow-sm">{b.title}</h3>
                  )}
                  {b.subtitle && (
                    <p className="text-white/75 text-[10px] leading-snug mt-0.5">{b.subtitle}</p>
                  )}
                  <Link href={b.href}>
                    <button className="flex items-center gap-1 mt-2 text-[10px] md:text-xs font-bold text-white/90 hover:text-white">
                      {b.cta} <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
