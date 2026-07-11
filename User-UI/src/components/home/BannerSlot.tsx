import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

/**
 * BannerSlot Component
 * 
 * Renders all banners assigned to a specific slot/position on the page.
 * Banners are displayed in order, and can be rotated/cycled if multiple banners exist in the same slot.
 * 
 * This replaces hardcoded banner sections and allows admins to manage banners by position/slot.
 */

interface Banner {
  id: string;
  title: string;
  imageUrl: string; // The URL of the banner image
  image?: string; // Backend might provide 'image' instead of 'imageUrl'
  link?: string;
  alt?: string;
  isActive: boolean;
  order: number;
}

interface BannerSlotProps {
  slotKey: string; // e.g., 'homepage-hero-slider', 'homepage-after-flash-sale'
  autoRotate?: boolean; // Auto-cycle through multiple banners
  rotationInterval?: number; // Milliseconds between rotations (default: 4000)
  className?: string;
}

export default function BannerSlot({
  slotKey,
  autoRotate = false,
  rotationInterval = 4000,
  className = ""
}: BannerSlotProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch banners for this slot
  useEffect(() => {
    const fetchBanners = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch banners by tag (which we're using as slotKey in the current backend)
        const url = new URL(`${API_BASE}/api/cms/banners`);
        if (slotKey) {
          url.searchParams.set('tag', slotKey);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`Failed to fetch banners: ${response.statusText}`);
        }

        const data = await response.json();
        const bannerList = Array.isArray(data) ? data : (data.data || []);
        
        // Filter active banners and sort by order
        const activeBanners = bannerList
          .filter((b: any) => b.isActive)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        setBanners(activeBanners);
        setCurrentIndex(0);
      } catch (err) {
        console.error(`Error fetching banners for slot '${slotKey}':`, err);
        setError(err instanceof Error ? err.message : 'Failed to load banners');
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, [slotKey]);

  // Auto-rotate banners
  useEffect(() => {
    if (!autoRotate || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, banners.length, rotationInterval]);

  // Don't render if no banners
  if (!loading && banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className={`banner-slot ${className}`}>
      {loading ? (
        <div className="w-full bg-muted rounded-lg animate-pulse" style={{ aspectRatio: '16/9' }} />
      ) : error ? (
        <div className="w-full bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : currentBanner ? (
        <div className="relative w-full overflow-hidden rounded-lg">
          {currentBanner.link ? (
            <a href={currentBanner.link} className="block">
              <img
                src={currentBanner.imageUrl || currentBanner.image}
                alt={currentBanner.alt || currentBanner.title}
                className="w-full h-auto object-cover"
              />
            </a>
          ) : (
            <img
              src={currentBanner.imageUrl || currentBanner.image}
              alt={currentBanner.alt || currentBanner.title}
              className="w-full h-auto object-cover"
            />
          )}

          {/* Banner indicators (dots) if multiple banners */}
          {banners.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Navigation arrows if multiple banners and not auto-rotating */}
          {banners.length > 1 && !autoRotate && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all"
                aria-label="Previous banner"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all"
                aria-label="Next banner"
              >
                ›
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
