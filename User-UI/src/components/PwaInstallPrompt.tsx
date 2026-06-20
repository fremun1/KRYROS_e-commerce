"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

const STORAGE_KEY = "kryros_pwa_prompt_dismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  const dismissed = useMemo(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) === "1";
  }, []);

  useEffect(() => {
    if (dismissed || isStandaloneMode()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), 1800);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem(STORAGE_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [dismissed]);

  const hidePrompt = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  if (!visible || !deferredPrompt || isStandaloneMode()) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 sm:bottom-6 sm:right-6 sm:left-auto z-[9997]">
      <div className="w-full sm:w-[360px] rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-4">
        <button
          type="button"
          onClick={hidePrompt}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <img
            src="/pwa-icon-192.png"
            alt="KRYROS app icon"
            className="w-14 h-14 rounded-2xl object-cover shadow-md flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">Install KRYROS</p>
            <p className="text-xs text-muted-foreground leading-5 mt-1">
              Add KRYROS to your phone for faster access, a cleaner full-screen experience, and app-style launch from your home screen.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          Works best when opened from Chrome or another supported browser.
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={hidePrompt}
            className="flex-1 h-11 rounded-2xl border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="flex-1 h-11 rounded-2xl bg-[var(--kryros-primary)] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[var(--kryros-primary-hover)] transition-colors disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            {installing ? "Opening..." : "Install app"}
          </button>
        </div>
      </div>
    </div>
  );
}
