import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ApiBanner } from "@/lib/api";

export default function PageBannerSlider({ banners }: { banners: ApiBanner[] }) {
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      if (!isDragging) setCurrent(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isDragging]);

  useEffect(() => {
    if (current >= banners.length) {
      setCurrent(0);
    }
  }, [banners.length, current]);

  if (banners.length === 0) return null;

  const goNext = () => setCurrent(prev => (prev + 1) % banners.length);
  const goPrev = () => setCurrent(prev => (prev - 1 + banners.length) % banners.length);

  // Touch/mouse drag handlers
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
    <div
      className="relative rounded-2xl overflow-hidden mb-6"
      style={{ aspectRatio: "16/9", maxHeight: "360px" }}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      ref={sliderRef}
    >
      {/* Slides track */}
      <div
        className="flex transition-transform duration-500 ease-out h-full w-full"
        style={{
          transform: `translateX(calc(-${current * 100}% + ${translateX}px))`,
          transitionDuration: isDragging ? "0ms" : "500ms",
        }}
      >
        {banners.map((banner) => {
          const mediaSrc = banner.image || banner.videoUrl || "";

          return (
            <div key={banner.id} className="min-w-full w-full flex-shrink-0 h-full relative">
              <img
                src={mediaSrc}
                alt={banner.title || ""}
                className="w-full h-full object-cover"
                draggable={false}
              />
              {banner.link && (
                <Link href={banner.link} className="absolute inset-0 block" aria-label={banner.title || "Banner link"} />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation arrows — desktop only */}
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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
