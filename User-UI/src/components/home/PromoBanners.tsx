import { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";

interface PromoBanner {
  id: string;
  href: string;
  image: string;
}

function homepageSectionToPromo(sec: ApiHomepageSection): PromoBanner | null {
  const cfg = (sec.config || {}) as Record<string, string>;
  const image = cfg.image || cfg.media || "";
  if (!image) return null;
  return {
    id: sec.id,
    href: cfg.href || cfg.link || cfg.button_link || "/shop",
    image,
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
          .map((s) => homepageSectionToPromo(s))
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
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl animate-pulse bg-muted h-[190px] md:h-[220px] lg:h-[250px]" />
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
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {banners.map((b) => (
            <Link key={b.id} href={b.href}>
              <a className="block relative rounded-2xl overflow-hidden h-[190px] md:h-[220px] lg:h-[250px]">
                <img
                  src={b.image}
                  alt=""
                  className="w-full h-full object-cover select-none"
                  fetchPriority="high"
                  decoding="async"
                  draggable={false}
                />
              </a>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
