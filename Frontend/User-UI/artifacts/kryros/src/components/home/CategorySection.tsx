import { useState, useEffect } from "react";
import { Link } from "wouter";
import { fetchHomepageCategories } from "@/lib/api";
import type { ApiCategory } from "@/lib/api";

const GRAD_PRESETS = [
  { from: "var(--kryros-dark-border)", to: "var(--kryros-light-text-main)" },
  { from: "#4c1d95", to: "#2e1065" },
  { from: "#0c4a6e", to: "#082f49" },
  { from: "#14532d", to: "#052e16" },
  { from: "#7c2d12", to: "#431407" },
  { from: "#1e1b4b", to: "#0f0d2e" },
  { from: "#1c1917", to: "#0c0a09" },
  { from: "#064e3b", to: "#022c22" },
];

const BADGES = ["LIMITED", "NEW ARRIVAL", "HOT DEALS", "TRENDING", "EXCLUSIVE", "POPULAR", "FEATURED", "SALE"];

export default function CategorySection() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    fetchHomepageCategories().then(setCategories);
  }, []);

  if (categories.length === 0) return null;

  return (
    <section className="py-4 bg-background">
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 md:px-6">
        {categories.map((cat, idx) => {
          const grad = GRAD_PRESETS[idx % GRAD_PRESETS.length];
          const badge = BADGES[idx % BADGES.length];
          const href = `/shop?cat=${encodeURIComponent(cat.slug || cat.name)}`;

          return (
            <Link key={cat.id} href={href}>
              <div
                className="flex-shrink-0 relative w-64 h-36 rounded-2xl overflow-hidden cursor-pointer group"
                style={{
                  background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)`,
                }}
              >
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute right-0 top-0 h-full w-40 object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                    style={{
                      maskImage: "linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
                      WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
                    }}
                  />
                )}

                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">
                    {badge}
                  </span>

                  <div>
                    <h3 className="text-xl font-black text-white uppercase leading-tight whitespace-pre-line mb-3">
                      {cat.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-widest text-white/80 uppercase group-hover:text-white transition-colors">
                        Browse Now
                      </span>
                      <span className="text-white/80 group-hover:text-white transition-all group-hover:translate-x-1 duration-200 text-sm">
                        →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
