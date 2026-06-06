import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";

interface UpgradeBannerConfig {
  heading: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  discountText: string;
  discountSubtext: string;
  bgImage: string;
}

function homepageSectionToUpgradeBanner(sec: ApiHomepageSection): UpgradeBannerConfig | null {
  const cfg = (sec.config || {}) as Record<string, any>;
  // Only show if admin has configured a background image
  const bgImage = cfg.media || cfg.bgImage || cfg.image || "";
  if (!bgImage) return null;
  return {
    heading: cfg.heading || cfg.button_text || "",
    subtitle: cfg.subtitle || "",
    ctaText: cfg.button_text || cfg.cta || "Shop Now",
    ctaLink: cfg.button_link || cfg.href || cfg.link || "/shop",
    discountText: cfg.discount_text || "",
    discountSubtext: cfg.discount_subtext || "",
    bgImage,
  };
}

export default function UpgradeBanner() {
  const [cfg, setCfg] = useState<UpgradeBannerConfig | null>(null);

  useEffect(() => {
    fetchHomepageSections("UpgradeBanner")
      .then((sections) => {
        if (sections.length > 0) {
          const mapped = homepageSectionToUpgradeBanner(sections[0]);
          if (mapped) setCfg(mapped);
        }
      })
      .catch(() => {});
  }, []);

  if (!cfg) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 185 }}>
        <img
          src={cfg.bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(100deg, rgba(5,15,30,0.92) 0%, rgba(5,20,40,0.70) 55%, rgba(5,40,40,0.28) 100%)" }}
        />
        <div className="relative z-10 flex items-center justify-between h-full px-5 py-5 gap-2">
          <div className="flex flex-col justify-center gap-2 min-w-0 flex-1">
            {cfg.heading && (
              <h2 className="text-[15px] md:text-2xl font-black text-white leading-snug">{cfg.heading}</h2>
            )}
            {cfg.subtitle && (
              <p className="text-[10px] text-white/60 leading-relaxed">{cfg.subtitle}</p>
            )}
            {cfg.ctaLink && (
              <Link href={cfg.ctaLink}>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-xl text-[11px] font-bold hover:bg-teal-400 transition-all active:scale-95 w-fit">
                  {cfg.ctaText || "Shop Now"} <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            )}
          </div>
          {(cfg.discountText || cfg.discountSubtext) && (
            <div className="text-right flex-shrink-0 pl-2">
              <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">Up to</p>
              {cfg.discountText && (
                <p className="text-5xl md:text-6xl font-black text-teal-400 leading-none">{cfg.discountText}</p>
              )}
              {cfg.discountSubtext && (
                <p className="text-2xl md:text-3xl font-black text-teal-400 -mt-1">{cfg.discountSubtext}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
