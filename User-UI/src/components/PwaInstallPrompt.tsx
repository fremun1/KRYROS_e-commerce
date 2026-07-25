"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

const STORAGE_KEY = "kryros_pwa_prompt_dismissed";
const MANUAL_DISMISS_MS = 1000 * 60 * 60 * 24 * 3;
const INSTALL_DISMISS_MS = 1000 * 60 * 60 * 24 * 30;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isDismissed() {
  if (typeof window === "undefined") return true;
  const storedValue = Number(localStorage.getItem(STORAGE_KEY) || "0");
  return Number.isFinite(storedValue) && storedValue > Date.now();
}

function rememberDismissal(durationMs: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(Date.now() + durationMs));
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const [shownOnce, setShownOnce] = useState(false);
  const [siteHost, setSiteHost] = useState("kryros.com");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(isDismissed());
    setSiteHost(window.location.host.replace(/^www\./, ""));
  }, []);

  useEffect(() => {
    if (dismissed || isStandaloneMode()) return;

    const markEngaged = () => setEngaged(true);

    window.addEventListener("pointerdown", markEngaged, { once: true });
    window.addEventListener("keydown", markEngaged, { once: true });
    window.addEventListener("scroll", markEngaged, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", markEngaged);
      window.removeEventListener("keydown", markEngaged);
      window.removeEventListener("scroll", markEngaged);
    };
  }, [dismissed]);

  useEffect(() => {
    if (dismissed || isStandaloneMode()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      rememberDismissal(INSTALL_DISMISS_MS);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [dismissed]);

  useEffect(() => {
    if (!deferredPrompt || !engaged || dismissed || shownOnce || isStandaloneMode()) return;

    const revealTimer = window.setTimeout(() => {
      setVisible(true);
      setShownOnce(true);
    }, 900);

    return () => window.clearTimeout(revealTimer);
  }, [deferredPrompt, dismissed, engaged, shownOnce]);

  useEffect(() => {
    if (!visible) return;

    const autoHideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 12000);

    return () => window.clearTimeout(autoHideTimer);
  }, [visible]);

  const hidePrompt = (persistForMs = MANUAL_DISMISS_MS) => {
    setVisible(false);
    setDeferredPrompt(null);
    rememberDismissal(persistForMs);
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        rememberDismissal(INSTALL_DISMISS_MS);
        setDismissed(true);
      } else {
        hidePrompt(MANUAL_DISMISS_MS);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  if (!visible || !deferredPrompt || isStandaloneMode()) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-[9997] sm:left-1/2 sm:right-auto sm:w-[min(32rem,calc(100vw-1.5rem))] sm:-translate-x-1/2">
      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card/95 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <img
            src="/apple-touch-icon.png"
            alt="KRYROS app icon"
            className="h-14 w-14 flex-shrink-0 rounded-[1.15rem] border border-border bg-card object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.35rem] leading-none font-medium tracking-[-0.03em] text-foreground">
              Install KRYROS
            </p>
            <p className="mt-1 truncate text-[1rem] leading-none text-muted-foreground">
              {siteHost}
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 hover:text-primary/80 disabled:opacity-70"
          >
            {installing ? "Opening..." : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
