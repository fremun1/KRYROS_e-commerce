import { useEffect, useState, useRef, useCallback } from "react";
import { fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerImage {
  url: string;
  link?: string;
}

export default function UpgradeBanner() {
  const [images, setImages] = useState<BannerImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SLIDE_INTERVAL = 4000;

  // Stop auto-slide
  const stopAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
  }, []);

  // Start auto-slide
  const startAuto = useCallback(() => {
    stopAuto();
    if (images.length > 1) {
      autoRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % images.length);
      }, SLIDE_INTERVAL);
    }
  }, [images.length, stopAuto]);

  useEffect(() => {
    fetchHomepageSections("UpgradeBanner")
      .then((sections) => {
        if (sections.length > 0) {
          const cfg = (sections[0].config || {}) as Record<string, any>;
          // Support multiple images: 'media' can be comma-separated URLs,
          // or we also support 'images' as a JSON array, or 'image' as single
          let rawImages: string[] = [];
          if (cfg.images && Array.isArray(cfg.images)) {
            rawImages = cfg.images.map((i: any) => typeof i === "string" ? i : i.url || "").filter(Boolean);
          } else if (cfg.media) {
            rawImages = String(cfg.media).split(",").map((s: string) => s.trim()).filter(Boolean);
          } else if (cfg.image) {
            rawImages = [String(cfg.image)];
          } else if (cfg.bgImage) {
            rawImages = [String(cfg.bgImage)];
          }

          const parsed = rawImages.map((url) => {
            const parts = url.split("|");
            return {
              url: parts[0].trim(),
              link: parts[1]?.trim() || undefined,
            };
          }).filter((i) => i.url);

          if (parsed.length > 0) setImages(parsed);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (images.length > 1) startAuto();
    return stopAuto;
  }, [images.length, startAuto, stopAuto]);

  const goTo = (index: number) => {
    setActiveIndex((index + images.length) % images.length);
    startAuto(); // reset timer
  };

  if (loading || images.length === 0) return null;

  const current = images[activeIndex];

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
      <div className="relative rounded-2xl overflow-hidden w-full" style={{ height: images.length === 1 ? 185 : 185 }}>
        {/* Image */}
        {current.link ? (
          <a href={current.link} className="block w-full h-full">
            <img
              src={current.url}
              alt=""
              className="w-full h-full object-cover"
            />
          </a>
        ) : (
          <img
            src={current.url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}

        {/* Navigation arrows — only show if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots indicator — only show if multiple images */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === activeIndex
                    ? "bg-white w-5"
                    : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
