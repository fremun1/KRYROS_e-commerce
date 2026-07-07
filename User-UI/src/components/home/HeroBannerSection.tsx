import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface HeroBannerSectionProps {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  duration?: number;
}

export default function HeroBannerSection({
  imageUrl,
  title,
  subtitle,
  buttonText,
  buttonLink,
  duration = 5,
}: HeroBannerSectionProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => setIsVisible(false), duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  if (!isVisible) {
    return null;
  }

  return (
    <section className="w-full bg-gradient-to-r from-primary/10 to-primary/5 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Image */}
          {imageUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-4">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-muted-foreground">
                {subtitle}
              </p>
            )}
            {buttonText && buttonLink && (
              <a
                href={buttonLink}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-semibold"
              >
                {buttonText}
                <ChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
