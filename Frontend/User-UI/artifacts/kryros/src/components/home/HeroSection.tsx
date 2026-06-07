import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { fetchBanners } from "@/lib/api";
import type { ApiBanner } from "@/lib/api";

const OVERLAY_COLORS = [
  { from: "rgba(15,30,25,0.82)", to: "rgba(15,30,25,0.10)" },
  { from: "rgba(15,10,35,0.82)", to: "rgba(15,10,35,0.08)" },
  { from: "rgba(30,15,10,0.82)", to: "rgba(30,15,10,0.08)" },
  { from: "rgba(10,25,15,0.82)", to: "rgba(10,25,15,0.08)" },
];

const DEFAULT_DURATION_MS = 5500;

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([-\w]{11})/);
  return m ? m[1] : null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(url) || url.startsWith("data:video/");
}

export default function HeroSection() {
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION_MS);
  const [totalDuration, setTotalDuration] = useState(DEFAULT_DURATION_MS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    fetchBanners().then((data) => {
      if (data.length > 0) setBanners(data);
    });
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const banner = banners[current];
    const duration = banner.duration ? banner.duration * 1000 : DEFAULT_DURATION_MS;
    setTotalDuration(duration);
    setTimeLeft(duration);
    startRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        setCurrent((c) => (c + 1) % banners.length);
      }
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, banners]);

  if (banners.length === 0) return null;

  const banner = banners[current];
  const overlay = OVERLAY_COLORS[current % OVERLAY_COLORS.length];

  // Determine media type and URL
  // When mediaType is explicitly "image", prefer banner.image so a stale
  // videoUrl from a previous video-type save doesn't override the image.
  const rawUrl = banner.mediaType === "image"
    ? (banner.image || banner.videoUrl || "")   // image type → image first
    : (banner.videoUrl || banner.image || "");   // video / unset → keep existing order
  const ytId = rawUrl ? getYouTubeId(rawUrl) : null;
  const isVideo = banner.mediaType === "video" || !!ytId || isDirectVideoUrl(rawUrl);
  const isYouTube = !!ytId;

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: "clamp(330px, 56vw, 520px)" }}
    >
      {/* Media layer */}
      <AnimatePresence mode="wait">
        {isYouTube ? (
          <motion.div
            key={banner.id + "-yt"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: "none" }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
              className="absolute inset-0 w-full h-full"
              style={{ border: "none", transform: "scale(1.05)" }}
              allow="autoplay; encrypted-media"
              allowFullScreen={false}
            />
          </motion.div>
        ) : isVideo ? (
          <motion.video
            key={banner.id + "-video"}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            src={rawUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <motion.img
            key={banner.id + "-img"}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            src={rawUrl}
            alt={banner.title}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        )}
      </AnimatePresence>

      {/* Overlay gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to right, ${overlay.from} 0%, ${overlay.to} 65%, transparent 100%)`,
          transition: "background 0.5s ease",
          zIndex: 1,
        }}
      />

      {/* Text content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id + "-text"}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 flex items-center"
          style={{ zIndex: 2 }}
        >
          <div className="px-6 md:px-14 max-w-[58%] md:max-w-[50%]">
            {banner.badge && (
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-3"
                style={{ color: "var(--kryros-primary)" }}>
                {banner.badge}
              </p>
            )}
            <h1 className="text-[22px] md:text-[46px] font-black text-white leading-[1.05] drop-shadow-md">
              {banner.title}
            </h1>
            {banner.subtitle && (
              <h2 className="text-[18px] md:text-[36px] font-black leading-[1.05] mb-2 md:mb-4 drop-shadow-md"
                style={{ color: "var(--kryros-primary)" }}>
                {banner.subtitle}
              </h2>
            )}
            {banner.link && (
              <Link href={banner.link}>
                <button
                  className="inline-flex items-center gap-2 px-5 md:px-7 py-2 md:py-3 rounded-lg font-semibold text-xs md:text-sm text-white hover:opacity-90 active:scale-95 transition-all shadow-lg mt-3 md:mt-5"
                  style={{ background: "var(--kryros-primary)" }}>
                  {banner.linkText || "Shop Now"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar: slide dots */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3 px-4"
        style={{ zIndex: 3 }}>
        {banners.length > 1 && (
          <div className="flex items-center gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? "w-5 h-2 bg-[var(--kryros-primary)]" : "w-2 h-2 bg-white/40 hover:bg-white/60"
                }`} />
            ))}
          </div>
        )}

      </div>

    </section>
  );
}
