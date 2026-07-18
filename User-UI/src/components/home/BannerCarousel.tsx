import { useState, useEffect, useRef, useCallback } from 'react';

interface BannerSlide {
  image: string;
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl?: string;
  buttonColor?: string;
  buttonTextColor?: string;
}

interface BannerCarouselProps {
  slides?: BannerSlide[];
  autoplay?: boolean;
  duration?: number;
  showDots?: boolean;
  showArrows?: boolean;
}

export default function BannerCarousel({
  slides = [],
  autoplay = true,
  duration = 5,
  showDots = true,
  showArrows = true,
}: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);
  const total = slides.length;

  // Stable callback using ref to avoid recreating intervals
  const currentRef = useRef(current);
  currentRef.current = current;

  const goTo = useCallback((index: number) => {
    const next = ((index % total) + total) % total;
    setCurrent(next);
  }, [total]);

  // Arrow handlers
  const goNext = useCallback(() => goTo(currentRef.current + 1), [goTo]);
  const goPrev = useCallback(() => goTo(currentRef.current - 1), [goTo]);

  // Autoplay — uses ref to avoid re-creating interval on every current change
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!autoplay || total <= 1) return;

    const intervalMs = Math.max(1, (duration || 5)) * 1000;
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setCurrent((prev) => (prev + 1) % total);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, total, duration, isPaused]);

  // Empty state
  if (!slides || total === 0) return null;

  const renderMedia = (slide: BannerSlide, idx: number) => {
    if (slide.videoUrl) {
      return (
        <video
          src={slide.videoUrl}
          className="w-full h-[200px] sm:h-[280px] md:h-[340px] object-cover pointer-events-none"
          autoPlay
          muted
          loop
          playsInline
          preload={idx === 0 ? 'auto' : 'metadata'}
        />
      );
    }

    return (
      <img
        src={slide.image}
        alt={slide.title || `Banner ${idx + 1}`}
        className="w-full h-[200px] sm:h-[280px] md:h-[340px] object-cover pointer-events-none"
        loading={idx === 0 ? 'eager' : 'lazy'}
        draggable={false}
      />
    );
  };

  const renderOverlay = (slide: BannerSlide) => {
    if (!(slide.title || slide.subtitle || slide.ctaText)) return null;

    return (
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent flex flex-col justify-end p-6 sm:p-8 md:p-12 pointer-events-none">
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
          <span
            className="inline-block px-5 py-2 rounded-lg text-sm font-semibold pointer-events-auto"
            style={{
              backgroundColor: slide.buttonColor || '#ffffff',
              color: slide.buttonTextColor || '#000000',
            }}
          >
            {slide.ctaText}
          </span>
        )}
      </div>
    );
  };

  // Single slide — no carousel
  if (total === 1) {
    const slide = slides[0];
    return (
      <div className="w-full">
        <a href={slide.linkUrl || '#'} className="block w-full">
          <div className="relative">
            {renderMedia(slide, 0)}
            {renderOverlay(slide)}
          </div>
        </a>
      </div>
    );
  }

  // ── Touch handlers ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent vertical scroll when swiping horizontally
    const dx = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    if (dx > dy && dx > 10) {
      e.preventDefault();
      touchMoved.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartRef.current.x - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
    >
      {/* Track */}
      <div
        className="flex transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, idx) => (
          <div key={idx} className="min-w-full relative flex-shrink-0 select-none">
            <a
              href={slide.linkUrl || '#'}
              className="block w-full"
              draggable={false}
            >
              {renderMedia(slide, idx)}
              {renderOverlay(slide)}
            </a>
          </div>
        ))}
      </div>

      {/* Arrows — always visible on mobile, hover on desktop */}
      {showArrows && total > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all z-10 active:scale-90"
            aria-label="Previous slide"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all z-10 active:scale-90"
            aria-label="Next slide"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {showDots && total > 1 && (
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
