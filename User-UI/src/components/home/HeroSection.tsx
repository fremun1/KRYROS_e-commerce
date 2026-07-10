import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchBanners } from "@/lib/api";
import type { ApiBanner } from "@/lib/api";

export default function HeroSection() {
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchBanners().then((data) => {
      if (data.length > 0) setBanners(data);
    });
  }, []);

  // Auto-rotate — pauses while dragging
  useEffect(() => {
    if (banners.length <= 1) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      if (!isDragging) setCurrent((c) => (c + 1) % banners.length);
    }, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [banners.length, isDragging]);

  if (banners.length === 0) {
    return (
      <section
        className="w-full bg-muted/20 animate-pulse"
        style={{ height: "clamp(150px, 44vw, 420px)" }}
      />
    );
  }

  const goNext = () => setCurrent((c) => (c + 1) % banners.length);
  const goPrev = () => setCurrent((c) => (c - 1 + banners.length) % banners.length);

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setTranslateX(0);
  };
  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    setTranslateX(clientX - startX);
  };
  const handleDragEnd = () => {
    if (!isDragging) return;
    if (Math.abs(translateX) > 50) {
      if (translateX > 0) goPrev();
      else goNext();
    }
    setIsDragging(false);
    setTranslateX(0);
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(150px, 44vw, 420px)" }}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      {/* Slides track */}
      <div
        className="flex h-full"
        style={{
          width: "100%",
          transform: `translateX(calc(-${current * 100}% + ${translateX}px))`,
          transition: isDragging ? "none" : "transform 500ms ease-out",
        }}
      >
        {banners.map((banner) => {
          const imgSrc = banner.image || banner.videoUrl || "";
          return banner.link ? (
            <Link
              key={banner.id}
              href={banner.link}
              className="flex-shrink-0 w-full h-full block"
            >
              <img
                src={imgSrc}
                alt=""
                className="w-full h-full object-cover select-none"
                draggable={false}
              />
            </Link>
          ) : (
            <div key={banner.id} className="flex-shrink-0 w-full h-full">
              <img
                src={imgSrc}
                alt=""
                className="w-full h-full object-cover select-none"
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      {/* Desktop arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors hidden sm:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors hidden sm:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
