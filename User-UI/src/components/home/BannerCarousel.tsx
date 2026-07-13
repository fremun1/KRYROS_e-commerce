import { useState, useEffect, useCallback, useRef } from 'react';

interface BannerSlide {
  image: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl?: string;
}

interface BannerCarouselProps {
  slides?: BannerSlide[];
  autoplay?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
}

export default function BannerCarousel({
  slides = [],
  autoplay = true,
  showDots = true,
  showArrows = true,
}: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const total = slides.length;

  const goTo = useCallback((index: number) => {
    setCurrent((index + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || total <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoplay, total, isHovered, next]);

  if (!slides || total === 0) return null;
  if (total === 1) {
    // Single slide, no carousel needed
    const slide = slides[0];
    return (
      <div className="w-full">
        <a href={slide.linkUrl || '#'} className="block w-full">
          <img
            src={slide.image}
            alt={slide.title || 'Banner'}
            className="w-full h-[200px] sm:h-[280px] md:h-[340px] object-cover"
          />
        </a>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides track */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, idx) => (
          <div key={idx} className="min-w-full relative flex-shrink-0">
            <a
              href={slide.linkUrl || '#'}
              className="block w-full"
            >
              <img
                src={slide.image}
                alt={slide.title || `Banner ${idx + 1}`}
                className="w-full h-[200px] sm:h-[280px] md:h-[340px] object-cover"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              {/* Text overlay - only if title or subtitle exists */}
              {(slide.title || slide.subtitle || slide.ctaText) && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent flex flex-col justify-end p-6 sm:p-8 md:p-12">
                  {slide.title && (
                    <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-bold mb-1 drop-shadow-lg">
                      {slide.title}
                    </h2>
                  )}
                  {slide.subtitle && (
                    <p className="text-white/90 text-sm sm:text-base mb-3 drop-shadow">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.ctaText && (
                    <span className="inline-block bg-white text-black px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition w-fit">
                      {slide.ctaText}
                    </span>
                  )}
                </div>
              )}
            </a>
          </div>
        ))}
      </div>

      {/* Arrows */}
      {showArrows && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
            aria-label="Previous slide"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
            aria-label="Next slide"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {showDots && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === current
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
