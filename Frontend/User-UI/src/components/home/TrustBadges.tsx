import { useEffect, useState } from "react";
import { Truck, ShieldCheck, RefreshCcw, Headphones, Star, Zap, Gift, Heart, Smartphone, CreditCard } from "lucide-react";
import { fetchHomepageSections, type ApiHomepageSection } from "@/lib/api";

const ICON_MAP: Record<string, any> = {
  Truck, ShieldCheck, RefreshCcw, Headphones, Star, Zap, Gift, Heart, Smartphone, CreditCard,
  // Common lowercase variants or aliases
  truck: Truck,
  shield: ShieldCheck,
  shieldcheck: ShieldCheck,
  refresh: RefreshCcw,
  refreshccw: RefreshCcw,
  headphones: Headphones,
  support: Headphones,
  star: Star,
  zap: Zap,
  gift: Gift,
  heart: Heart,
  phone: Smartphone,
  smartphone: Smartphone,
  credit: CreditCard,
  creditcard: CreditCard,
};

interface TrustBadge {
  icon: string;
  title: string;
  subtitle: string;
}

function homepageSectionToTrustBadges(sec: ApiHomepageSection): TrustBadge[] | null {
  // The admin panel saves fields into sec.config.
  // For Trust Badges, it saves a single 'items' field which might be a JSON string.
  let cfg = (sec.config || {}) as Record<string, any>;
  
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      console.warn('[TrustBadges] Failed to parse config as JSON:', cfg);
      return null;
    }
  }
  
  // The admin panel might save the items as a string inside config.items
  let items = cfg.items;
  
  // If items is a string, it's likely a JSON string from the admin textarea
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      console.warn('[TrustBadges] Failed to parse items string as JSON:', items);
      // If it's not JSON, it might be malformed or empty
      return null;
    }
  }
  
  // If we still don't have an array, check if it's nested under config.value (legacy)
  if (!Array.isArray(items) && cfg.value?.items) {
    items = cfg.value.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = null; }
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.warn('[TrustBadges] No valid items array found in config:', cfg);
    return null;
  }
  
  return items.map((item: any) => ({
    icon: item.icon || item.badge_icon || "Truck",
    title: item.title || item.heading || item.badge_title || "",
    subtitle: item.subtitle || item.subheading || item.text || item.badge_subtitle || "",
  }));
}

export default function TrustBadges() {
  const [badges, setBadges] = useState<TrustBadge[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomepageSections("TrustBadges")
      .then((sections) => {
        if (sections.length > 0) {
          console.log('[TrustBadges] Raw section data:', sections[0]);
          const mapped = homepageSectionToTrustBadges(sections[0]);
          if (mapped) {
            console.log('[TrustBadges] Successfully mapped badges:', mapped);
            setBadges(mapped);
          } else {
            console.warn('[TrustBadges] Mapping failed for section:', sections[0]);
          }
        } else {
          console.warn('[TrustBadges] No active TrustBadges section found in CMS');
        }
      })
      .catch((err) => {
        console.error('[TrustBadges] API fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!badges || badges.length === 0) return null;

  return (
    <section className="border-t border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-3 md:px-6">
        {/* Mobile: 2×2 grid */}
        <div className="grid grid-cols-2 gap-0 md:hidden divide-y divide-border">
          {badges.map(({ icon, title, subtitle }, i) => {
            const Icon = ICON_MAP[icon] || ICON_MAP[icon.toLowerCase().replace(/[^a-z0-9]/g, "")] || Truck;
            return (
              <div key={i} className={`flex items-center gap-2.5 py-3 px-3 ${i % 2 === 0 ? "border-r border-border" : ""}`}>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
        {/* Desktop: single row with dividers */}
        <div className="hidden md:flex items-center divide-x divide-border">
          {badges.map(({ icon, title, subtitle }, i) => {
            const Icon = ICON_MAP[icon] || ICON_MAP[icon.toLowerCase().replace(/[^a-z0-9]/g, "")] || Truck;
            return (
              <div key={i} className="flex items-center gap-3 py-4 px-8 flex-1">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
