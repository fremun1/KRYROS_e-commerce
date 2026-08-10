import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

interface BannerSlide {
  image: string;
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  enableControls?: boolean;
  enableSound?: boolean;
}

interface BannerCarouselProps {
  slides?: BannerSlide[];
  autoplay?: boolean;
  duration?: number;
  showDots?: boolean;
  showArrows?: boolean;

  // Layout control
  title?: string;
  subtitle?: string;
  titleAlign?: 'left' | 'center' | 'right';
  showSeeAll?: boolean;
  viewAllHref?: string;
  viewAllText?: string;
  accentColor?: string;
  textColor?: string;
  headerBgColor?: string;
}

const bannerFrameClassName =
  "mx-auto w-full max-w-[1440px] px-1.5 pt-2 sm:px-4 sm:pt-3 md:px-6";

const bannerShellClassName =
  "relative overflow-hidden rounded-[8px] border border-border bg-card shadow-lg ring-1 ring-border/50 sm:rounded-[10px]";

const bannerMediaClassName =
  "w-full h-[180px] object-cover pointer-events-none sm:h-[250px] md:h-[380px] lg:h-[480px] xl:h-[540px]";

export default function BannerCarousel({
  slides = [],
  autoplay = true,
  duration = 5,
  showDots = true,
  showArrows = true,
  title,
  subtitle,
  titleAlign = 'left',
  showSeeAll = false,
  viewAllHref = '#',
  viewAllText = 'See All',
  accentColor,
  textColor,
  headerBgColor
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
      const mediaClass = slide.enableControls
        ? bannerMediaClassName.replace("pointer-events-none", "")
        : bannerMediaClassName;

      return (
        <video
          src={slide.videoUrl}
          className={mediaClass}
          autoPlay
          muted={!slide.enableSound}
          controls={slide.enableControls}
          loop={!slide.enableControls}
          playsInline
          preload={idx === 0 ? 'auto' : 'metadata'}
        />
      );
    }

    return (
      <img
        src={slide.image}
        alt={slide.title || `Banner ${idx + 1}`}
        className={bannerMediaClassName}
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
          <div className="flex w-full justify-center pt-2 sm:pt-4">
            <span
              className="inline-flex min-w-[120px] max-w-full translate-y-3 items-center justify-center rounded-md px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide pointer-events-auto sm:min-w-[130px] sm:px-4 sm:py-2 sm:text-xs"
              style={{
                backgroundColor: slide.buttonColor || 'var(--kryros-white)',
                color: slide.buttonTextColor || 'var(--kryros-black-primary)',
              }}
            >
              {slide.ctaText}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Single slide — no carousel
  if (total === 1) {
    const slide = slides[0];
    return (
      <div className={bannerFrameClassName}>
        {title && (
          <div
            className={
              titleAlign === 'center'
                ? `flex flex-col items-center justify-center text-center py-4 gap-2 mb-4 ${headerBgColor ? 'px-4 md:px-6' : ''}`
                : titleAlign === 'right'
                ? `flex flex-row-reverse items-center justify-between py-3 mb-4 ${headerBgColor ? 'px-4 md:px-6' : ''}`
                : `flex items-center justify-between py-3 mb-4 ${headerBgColor ? 'px-4 md:px-6' : ''}`
            }
            style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
          >
            <div className={
              titleAlign === 'center'
                ? 'flex flex-col items-center justify-center text-center min-w-0'
                : titleAlign === 'right'
                ? 'text-right min-w-0'
                : 'min-w-0'
            }>
              <h2
                className="text-xl font-bold tracking-tight text-foreground"
                style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
              >
                {title}
              </h2>
              {subtitle && (
                <p className={`text-[13px] leading-[18px] mt-0.5 ${headerBgColor ? 'text-white/80' : 'text-muted-foreground'} ${titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left'}`}>
                  {subtitle}
                </p>
              )}
            </div>

            {showSeeAll && (
              <a
                href={viewAllHref}
                className={`flex items-center gap-0.5 text-[14px] font-semibold hover:opacity-80 transition-colors shrink-0 whitespace-nowrap ${titleAlign === 'center' ? 'mt-2' : titleAlign === 'right' ? 'mr-4' : 'ml-4'}`}
                style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
              >
                {viewAllText}
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </a>
            )}
          </div>
        )}
        <a href={slide.linkUrl || '#'} className="block w-full">
          <div className={bannerShellClassName}>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-white/70" />
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

  const trackTranslate = total > 0 ? (current * 100) / total : 0;

  return (
    <div className={bannerFrameClassName}>
      {title && (
        <div
          className={
            titleAlign === 'center'
              ? `flex flex-col items-center justify-center text-center py-4 gap-2 mb-4 ${headerBgColor ? 'px-4 md:px-6' : ''}`
              : titleAlign === 'right'
              ? `flex flex-row-reverse items-center justify-between py-3 mb-4 ${headerBgColor ? 'px-4 md:px-6' : ''}`
              : `flex items-center justify-between py-3 mb-4 ${headerBgColor ? 'px-4 md:px-6' : ''}`
          }
          style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
        >
          <div className={
            titleAlign === 'center'
              ? 'flex flex-col items-center justify-center text-center min-w-0'
              : titleAlign === 'right'
              ? 'text-right min-w-0'
              : 'min-w-0'
          }>
            <h2
              className="text-xl font-bold tracking-tight text-foreground"
              style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
            >
              {title}
            </h2>
            {subtitle && (
              <p className={`text-[13px] leading-[18px] mt-0.5 ${headerBgColor ? 'text-white/80' : 'text-muted-foreground'} ${titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left'}`}>
                {subtitle}
              </p>
            )}
          </div>

          {showSeeAll && (
            <a
              href={viewAllHref}
              className={`flex items-center gap-0.5 text-[14px] font-semibold hover:opacity-80 transition-colors shrink-0 whitespace-nowrap ${titleAlign === 'center' ? 'mt-2' : titleAlign === 'right' ? 'mr-4' : 'ml-4'}`}
              style={textColor || accentColor ? { color: textColor || accentColor } : undefined}
            >
              {viewAllText}
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </a>
          )}
        </div>
      )}
      <div
        className={`${bannerShellClassName} group`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-white/70" />

        {/* Track */}
        <div
          className="flex transition-transform duration-500 ease-out will-change-transform"
          style={{
            width: `${total * 100}%`,
            transform: `translate3d(-${trackTranslate}%, 0, 0)`,
            touchAction: 'pan-y',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className="relative flex-shrink-0 select-none"
              style={{ width: `${100 / total}%` }}
            >
              <a
                href={slide.linkUrl || '#'}
                className="block w-full"
                draggable={false}
                onClick={(e) => {
                  if (touchMoved.current) {
                    e.preventDefault();
                    touchMoved.current = false;
                  }
                }}
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
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-slate-950/40 text-white shadow-lg shadow-slate-950/20 transition-all active:scale-90 hover:bg-slate-950/72 sm:left-4"
              aria-label="Previous slide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-slate-950/40 text-white shadow-lg shadow-slate-950/20 transition-all active:scale-90 hover:bg-slate-950/72 sm:right-4"
              aria-label="Next slide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}

        {/* Dots */}
        {showDots && total > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-slate-950/18 px-3 py-2 backdrop-blur-sm">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === current
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/55 hover:bg-white/85'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
