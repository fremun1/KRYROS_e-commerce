import { Link } from "wouter";

interface ContentSectionProps {
  title?: string;
  subtitle?: string;
  layout?: 'hero' | 'features-grid' | 'accordion' | 'rich-text' | 'form' | 'gallery';
  items?: any[];
  backgroundImage?: string;
  bgColor?: string;
  backgroundColor?: string;
  ctaText?: string;
  ctaLink?: string;
  content?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function ContentSection({
  title,
  subtitle,
  layout = 'rich-text',
  items,
  backgroundImage,
  bgColor,
  backgroundColor,
  ctaText,
  ctaLink,
  content,
  email,
  phone,
  address,
}: ContentSectionProps) {

  switch (layout) {
    // ── HERO LAYOUT ──
    case 'hero':
      return (
        <div
          className="relative w-full h-64 md:h-80 flex items-center justify-center text-center px-4 overflow-hidden"
          style={backgroundColor || bgColor ? { backgroundColor: backgroundColor || bgColor } : undefined}
        >
          {backgroundImage && (
            <img src={backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-kryros-overlay-dark/50" />
          <div className="relative z-10 text-white">
            <h1 className="text-3xl font-black mb-2">{title || 'Welcome'}</h1>
            {subtitle && <p className="text-lg opacity-90">{subtitle}</p>}
            {ctaText && ctaLink && (
              <Link href={ctaLink}>
                <a className="inline-block mt-4 px-6 py-2 bg-background text-foreground rounded-xl text-sm font-bold">
                  {ctaText}
                </a>
              </Link>
            )}
          </div>
        </div>
      );

    // ── FEATURES GRID LAYOUT ──
    case 'features-grid':
      return (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h3 className="text-2xl font-black text-center mb-6">{title || 'Features'}</h3>
          {subtitle && <p className="text-center text-muted-foreground mb-6">{subtitle}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(items || []).map((item: any, i: number) => (
              <div key={i} className="bg-card border rounded-2xl p-5">
                <p className="font-bold text-sm mb-1">{item.title || item.feature_title || `Feature ${i + 1}`}</p>
                <p className="text-xs text-muted-foreground">{item.text || item.feature_text || ''}</p>
              </div>
            ))}
            {/* If no items, render placeholder items from config */}
            {(!items || items.length === 0) && [1, 2, 3].map((num) => (
              <div key={num} className="bg-card border rounded-2xl p-5">
                <p className="font-bold text-sm mb-1">{`Feature ${num}`}</p>
                <p className="text-xs text-muted-foreground"></p>
              </div>
            ))}
          </div>
        </div>
      );

    // ── ACCORDION LAYOUT ──
    case 'accordion':
      return (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
          {items ? items.map((item: any, i: number) => (
            <div key={i} className="bg-card border rounded-xl p-4">
              <p className="font-bold text-sm mb-1">{item.question || item.title || 'Question'}</p>
              <p className="text-xs text-muted-foreground">{item.answer || item.text || ''}</p>
            </div>
          )) : (
            <div className="bg-card border rounded-xl p-4">
              <p className="font-bold text-sm mb-1">{title || 'FAQ'}</p>
              <p className="text-xs text-muted-foreground">{content || ''}</p>
            </div>
          )}
        </div>
      );

    // ── RICH TEXT LAYOUT ──
    case 'rich-text':
      return (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-black mb-4">{title || 'Content'}</h2>
          {subtitle && <p className="text-muted-foreground mb-4">{subtitle}</p>}
          {content && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{content}</div>
          )}
        </div>
      );

    // ── FORM LAYOUT ──
    case 'form':
      return (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-black mb-1">{title || 'Contact Us'}</h2>
          {subtitle && <p className="text-muted-foreground mb-4">{subtitle}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {email && (
              <div className="bg-card border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-bold text-sm">{email}</p>
              </div>
            )}
            {phone && (
              <div className="bg-card border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-bold text-sm">{phone}</p>
              </div>
            )}
            {address && (
              <div className="bg-card border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-bold text-sm">{address}</p>
              </div>
            )}
          </div>
        </div>
      );

    // ── GALLERY LAYOUT ──
    case 'gallery':
      return (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h3 className="text-lg font-bold mb-4">{title || 'Gallery'}</h3>
          {items && items.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map((item: any, i: number) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden">
                  <img src={item.image || item.url} alt={item.alt || item.title || ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-muted rounded-xl" />
              ))}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-black mb-4">{title || 'Section'}</h2>
          {content && <div className="text-sm text-muted-foreground">{content}</div>}
        </div>
      );
  }
}
