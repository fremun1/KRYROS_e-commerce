import { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";

interface PromoCard {
  id: string;
  href: string;
  image?: string;
  gradient: string;
}

const GRADIENTS = [
  "linear-gradient(135deg, #0f4c35 0%, #1a7a52 50%, var(--kryros-primary) 100%)",
  "linear-gradient(135deg, #1a3a5c 0%, #1e5f8c 50%, #0ea5c9 100%)",
  "linear-gradient(135deg, #3b1f6b 0%, #5c2fa0 50%, #7c3aed 100%)",
  "linear-gradient(135deg, #7c1d1d 0%, var(--kryros-danger) 50%, var(--kryros-danger) 100%)",
];

function sectionToCard(s: ApiHomepageSection, index: number): PromoCard {
  const cfg = s.config as any;
  return {
    id: s.id,
    href: cfg?.href || cfg?.link || cfg?.button_link || "/shop",
    image: cfg?.image || undefined,
    gradient: cfg?.gradient || GRADIENTS[index % GRADIENTS.length],
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
        const validSections = [...newSections, ...legacySections].filter((s) => {
          const cfg = s.config as any;
          return cfg && (cfg.title || cfg.tag || cfg.image || cfg.gradient);
        });
        setCards(validSections.slice(0, 4).map(sectionToCard));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            <a
              className="flex-shrink-0 overflow-hidden rounded-[14px] block"
              style={{ width: "min(88vw, 380px)", height: 200, scrollSnapAlign: "start" }}
              draggable={false}
            >
              {b.image ? (
                <img
                  src={b.image}
                  alt=""
                  className="w-full h-full object-cover select-none"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full" style={{ background: b.gradient }} />
              )}
            </a>
          </Link>
        ))}
      </div>
    </section>
  );
}
