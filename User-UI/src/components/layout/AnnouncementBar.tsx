import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "wouter";
import { api, EFFECTIVE_API_BASE } from "@/lib/api";

interface AnnouncementBarProps {
  text?: string;
  ctaText?: string;
  ctaLink?: string;
  bgColor?: string;
  textColor?: string;
  enabled?: boolean;
  pageSlug?: string;
}

export default function AnnouncementBar({
  text,
  ctaText,
  ctaLink,
  bgColor,
  textColor,
  enabled = true,
  pageSlug = 'homepage',
}: AnnouncementBarProps) {
  const [config, setConfig] = useState<AnnouncementBarProps | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // If props are passed directly (used as CMS section), use them
    if (text) {
      setConfig({ text, ctaText, ctaLink, bgColor, textColor, enabled });
      return;
    }

    // Otherwise, fetch from CMS sections for the page
    const fetchAnnouncement = async () => {
      try {
        const response = await api.get(`/api/cms/sections?pageSlug=${pageSlug}`);
        const sections: any[] = Array.isArray(response.data) ? response.data : [];
        const announcementSection = sections.find((s: any) =>
          s.templateType === 'AnnouncementBar' || s.type === 'announcement_bar'
        );
        if (announcementSection) {
          const cfg = announcementSection.config || {};
          setConfig({
            text: cfg.text || cfg.announcementText,
            ctaText: cfg.ctaText || cfg.announcementCta,
            ctaLink: cfg.ctaLink || cfg.announcementCtaLink,
            bgColor: cfg.bgColor || cfg.announcementBgColor,
            textColor: cfg.textColor || cfg.announcementTextColor,
            enabled: cfg.enabled !== false,
          });
        }
      } catch {
        // Fallback: try legacy site-config endpoint
        try {
          const res = await fetch(`${EFFECTIVE_API_BASE}/api/cms/site-config/header`, { cache: "no-store" });
          if (res.ok) {
            const d = await res.json();
            if (d?.value?.announcementEnabled && d.value?.announcementText) {
              setConfig({
                text: d.value.announcementText,
                ctaText: d.value.announcementCta,
                ctaLink: d.value.announcementCtaLink,
                bgColor: d.value.announcementBgColor,
                textColor: d.value.announcementTextColor,
                enabled: d.value.announcementEnabled,
              });
            }
          }
        } catch {}
      }
    };

    fetchAnnouncement();
  }, [text, pageSlug]);

  const [storeStatus, setStoreStatus] = useState<any>(null);

  useEffect(() => {
    import("@/lib/api").then(({ fetchStoreStatus }) => {
      fetchStoreStatus().then(res => setStoreStatus(res)).catch(() => {});
    });
  }, []);

  const isClosed = storeStatus?.isStoreClosed;
  const closedMessage = storeStatus?.message || "The store is currently closed for purchases.";

  const isActive = (enabled && config?.enabled && config?.text && !hidden) || isClosed;
  if (!isActive) return null;

  const displayMessage = isClosed ? closedMessage : config?.text;

  return (
    <div
      className="bg-[var(--kryros-white)] text-[var(--kryros-announcement-text)] text-[10px] md:text-xs border-b border-border"
      style={{
        ...(config?.bgColor ? { backgroundColor: config.bgColor } : {}),
        ...(config?.textColor ? { color: config.textColor } : {}),
      }}
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-2 lg:max-w-screen-xl lg:mx-auto lg:px-8" style={isClosed ? { backgroundColor: 'var(--kryros-announcement-closed-bg)', color: 'var(--kryros-announcement-closed-text)' } : undefined}>
        <div className="flex items-center gap-2 font-bold">
          {isClosed && <span className="px-2 py-0.5 bg-white text-destructive rounded text-[9px] uppercase tracking-wider font-black">STORE CLOSED</span>}
          <span>{displayMessage}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isClosed && config?.ctaText && config?.ctaLink && (
            <Link href={config.ctaLink}>
              <span className="flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity font-medium">
                {config.ctaText} <span className="text-[10px]">&rsaquo;</span>
              </span>
            </Link>
          )}
          {!isClosed && (
            <button
              onClick={() => setHidden(true)}
              className="p-0.5 rounded hover:bg-white/20 transition-colors ml-1 flex-shrink-0"
              aria-label="Dismiss announcement"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
