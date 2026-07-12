import { Link } from "wouter";

interface BannerData {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  videoUrl?: string;
  link?: string;
  linkText?: string;
  tag?: string;
  badge?: string;
  secondaryCta?: string;
  secondaryCtaLink?: string;
  gradient?: string;
  bgColor?: string;
}

interface PromoBannerProps {
  tag?: string;
  title?: string;
  subtitle?: string;
  desc?: string;
  cta?: string;
  href?: string;
  image?: string;
  gradient?: string;
  emoji?: string;
  mode?: 'image-only' | 'rich';
}

export default function PromoBanner({
  tag,
  title,
  subtitle,
  desc,
  cta,
  href,
  image,
  gradient,
  emoji,
  mode = 'rich',
}: PromoBannerProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div
        className="w-full rounded-2xl p-6 md:p-10 text-center text-white"
        style={{
          background: gradient || 'linear-gradient(135deg, #1FA89A, #27B9AF)',
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {tag && (
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">{tag}</span>
        )}
        {emoji && <span className="text-3xl mb-2 block">{emoji}</span>}
        {title && <h3 className="text-xl md:text-2xl font-black mb-2">{title}</h3>}
        {subtitle && <p className="text-sm md:text-base opacity-90 mb-4">{subtitle}</p>}
        {desc && <p className="text-xs md:text-sm opacity-75 mb-4 max-w-lg mx-auto">{desc}</p>}
        {cta && href && (
          <Link href={href}>
            <a className="inline-block px-6 py-2 bg-white text-gray-900 rounded-xl text-sm font-bold">
              {cta}
            </a>
          </Link>
        )}
      </div>
    </div>
  );
}
