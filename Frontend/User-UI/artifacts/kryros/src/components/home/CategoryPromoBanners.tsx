import { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";

interface PromoCard {
  id: string;
  tag: string;
  title: string;
  sub: string;
  desc: string;
  href: string;
  gradient: string;
  emoji: string;
  image?: string; // optional background image — overrides gradient
}

const COLOR_THEMES: Record<string, string> = {
  "Green/Teal": "linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, var(--kryros-primary) 100%)",
  "Blue": "linear-gradient(135deg, #1a3a5c 0%, #1e5f8c 50%, #0ea5c9 100%)",
  "Purple": "linear-gradient(135deg, #3b1f6b 0%, #5c2fa0 50%, #7c3aed 100%)",
  "Red": "linear-gradient(135deg, #7c1d1d 0%, var(--kryros-danger) 50%, var(--kryros-danger) 100%)",
};

const GRADIENTS = [
  "linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, var(--kryros-primary) 100%)",
  "linear-gradient(135deg, #1a3a5c 0%, #1e5f8c 50%, #0ea5c9 100%)",
  "linear-gradient(135deg, #3b1f6b 0%, #5c2fa0 50%, #7c3aed 100%)",
  "linear-gradient(135deg, #7c1d1d 0%, var(--kryros-danger) 50%, var(--kryros-danger) 100%)",
];

const EMOJIS = ["🛒", "🎁", "🚚", "⚡"];

function sectionToCard(s: ApiHomepageSection, index: number): PromoCard {
  const cfg = s.config as any;
  // Resolve gradient: explicit gradient > color_theme name > default by index
  const gradient =
    cfg?.gradient ||
    COLOR_THEMES[cfg?.color_theme] ||
    GRADIENTS[index % GRADIENTS.length];

  return {
    id: s.id,
    tag: cfg?.tag || s.title || "OFFER",
    title: cfg?.title || s.title || "Special Offer",
    sub: cfg?.subtitle || cfg?.sub || "",
    desc: cfg?.description || cfg?.desc || "",
    href: cfg?.href || cfg?.link || cfg?.button_link || "/shop",
    gradient,
    emoji: cfg?.emoji || EMOJIS[index % EMOJIS.length],
    image: cfg?.image || undefined, // background image overrides gradient
  };
}

export default function CategoryPromoBanners() {
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchHomepageSections("CategoryPromoBanners"),
      fetchHomepageSections("promo_banners"),
    ])
      .then(([newSections, legacySections]) => {
        // Filter out container/placeholder sections (empty config + generic title)
        const validSections = [...newSections, ...legacySections].filter((s) => {
          const cfg = s.config as any;
          // Keep sections that have actual card content in their config
          return cfg && (cfg.title || cfg.tag || cfg.image || cfg.gradient);
        });
        setCards(validSections.slice(0, 4).map(sectionToCard));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 md:px-6 mb-8">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-2xl animate-pulse bg-muted"
              style={{ width: "min(88vw, 380px)", height: 200 }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 mb-8">
      <div
        className="flex gap-3 overflow-x-auto no-scrollbar pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {cards.map((b) => (
          <Link key={b.id} href={b.href}>
            <div
              className="relative flex-shrink-0 overflow-hidden cursor-pointer group hover:shadow-xl transition-shadow duration-300"
              style={{
                borderRadius: 14,
                width: "min(88vw, 380px)",
                height: 200,
                scrollSnapAlign: "start",
                // Use gradient as base — image overlays on top
                background: b.gradient,
              }}
            >
              {/* Background image layer (if uploaded) */}
              {b.image && (
                <img
                  src={b.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                
                  loading="lazy" decoding="async" />
              )}

              {/* Dark overlay — stronger on image, subtle on gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: b.image
                    ? "linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)"
                    : "transparent",
                }}
              />

              {/* Text content */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 pr-[44%] z-10">
                <span
                  className="self-start text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.22)", color: "#fff" }}
                >
                  {b.tag}
                </span>
                <div>
                  <h3 className="text-white font-black text-[17px] leading-tight drop-shadow-sm">
                    {b.title}
                  </h3>
                  <p className="text-white/85 font-medium text-[11px] leading-tight mt-0.5">
                    {b.sub}
                  </p>
                  <p className="text-white/60 text-[9px] leading-tight mt-1 line-clamp-2">
                    {b.desc}
                  </p>
                </div>
                <button
                  className="self-start text-[10px] font-bold px-3 py-1 rounded-full mt-1 transition-all group-hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.22)", color: "#fff" }}
                >
                  Learn more
                </button>
              </div>

              {/* Right side: emoji (only shown if no image, or always as accent) */}
              {!b.image && (
                <div
                  className="absolute right-0 top-0 bottom-0 flex items-center justify-center z-10"
                  style={{ width: "44%" }}
                >
                  <div className="text-6xl select-none">{b.emoji}</div>
                </div>
              )}

              {/* Right side image accent when background image is present */}
              {b.image && (
                <div
                  className="absolute right-3 top-0 bottom-0 flex items-center justify-center z-10 opacity-60"
                  style={{ width: "40%" }}
                >
                  <div className="text-5xl select-none">{b.emoji}</div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
