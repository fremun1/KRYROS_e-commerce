import { useState, useEffect, useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<1 | -1>(1);
  const animRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    fetchHomepageCategories().then(setCategories);
  }, []);

  // Auto-scroll left ↔ right
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || categories.length === 0) return;

    const SPEED = 0.35; // px per ms

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
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);

    return () => {
      cancelAnimationFrame(animRef.current);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [categories]);

  if (categories.length === 0) return null;

  return (
    <section className="py-4 bg-background">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-3 md:px-6"
      >
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
