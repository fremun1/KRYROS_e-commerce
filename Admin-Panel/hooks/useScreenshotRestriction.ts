"use client";
import { useEffect, useState, useRef } from "react";
import React from "react";
import api from "@/lib/api";

export function useScreenshotRestriction() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch setting from backend
  // FIX: The backend GET /api/settings returns a plain array at res.data (not res.data.data).
  // The settings page uses getSettings() which also returns res.data as an array.
  // We handle both shapes defensively.
  useEffect(() => {
    let cancelled = false;
    const fetchSetting = async () => {
      try {
        const res = await api.get("/api/settings");
        // Backend returns plain array at res.data; handle both shapes defensively
        const raw = res.data;
        const settings: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        const setting = settings.find(
          (s: any) => s.key === "admin_screenshot_restriction_enabled"
        );
        const value = setting?.value ?? "false";
        if (!cancelled) setEnabled(value === "true");
      } catch {
        // Silently fail — default to disabled
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    fetchSetting();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep stable refs for event handlers so add/remove pairs always match
  const handlersRef = useRef<{
    preventDefault: (e: Event) => void;
    handleKeyDown: (e: KeyboardEvent) => void;
    handleKeyUp: (e: KeyboardEvent) => void;
    handleDevToolsShortcuts: (e: KeyboardEvent) => void;
    handleBlur: () => void;
    handleFocus: () => void;
    handleVisibilityChange: () => void;
    handleCopy?: (e: any) => void;
  } | null>(null);

  const blurOverlayRef = useRef<HTMLDivElement | null>(null);
  const watermarkRef = useRef<HTMLDivElement | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (message: string) => {
    const existing = document.getElementById("screenshot-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "screenshot-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1f1f1f;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: ssToastIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    if (!document.getElementById("screenshot-toast-styles")) {
      const style = document.createElement("style");
      style.id = "screenshot-toast-styles";
      style.textContent = `
        @keyframes ssToastIn {
          from { transform: translateY(100px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      toast.style.animation = "ssToastIn 0.3s ease-out reverse";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const blurContent = () => {
    if (blurOverlayRef.current) return;
    const overlay = document.createElement("div");
    overlay.id = "screenshot-blur-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, sans-serif;
      font-size: 18px;
      pointer-events: none;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        <div style="font-weight:600;margin-bottom:8px;">Content Protected</div>
        <div style="font-size:14px;opacity:0.8;">Screenshot restriction is active</div>
      </div>
    `;
    document.body.appendChild(overlay);
    blurOverlayRef.current = overlay;
  };

  const unblurContent = () => {
    if (blurOverlayRef.current) {
      blurOverlayRef.current.remove();
      blurOverlayRef.current = null;
    }
    const existing = document.getElementById("screenshot-blur-overlay");
    if (existing) existing.remove();
  };

  const addWatermark = () => {
    if (watermarkRef.current) return;
    const container = document.createElement("div");
    container.id = "screenshot-watermark";
    container.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      pointer-events: none;
      z-index: 999998;
      overflow: hidden;
      opacity: 0.04;
    `;

    const text = "KRYROS ADMIN • CONFIDENTIAL";
    const spacingX = 250;
    const spacingY = 150;

    for (let y = -spacingY; y < window.innerHeight + spacingY; y += spacingY) {
      for (let x = -spacingX; x < window.innerWidth + spacingX; x += spacingX) {
        const mark = document.createElement("div");
        mark.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          transform: rotate(-20deg);
          white-space: nowrap;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          user-select: none;
          -webkit-user-select: none;
        `;
        mark.textContent = text;
        container.appendChild(mark);
      }
    }
    document.body.appendChild(container);
    watermarkRef.current = container;
  };

  const removeWatermark = () => {
    if (watermarkRef.current) {
      watermarkRef.current.remove();
      watermarkRef.current = null;
    }
    const existing = document.getElementById("screenshot-watermark");
    if (existing) existing.remove();
  };

  // ── Apply / Remove ─────────────────────────────────────────────────────────

  const applyRestrictions = () => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const blockedCombos: Array<{
        key: string;
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
        altKey?: boolean;
      }> = [
        // PrintScreen
        { key: "PrintScreen" },
        // Ctrl/Cmd+P (Print)
        { key: "p", ctrlKey: true },
        { key: "p", metaKey: true },
        // Ctrl/Cmd+Shift+I (DevTools)
        { key: "i", ctrlKey: true, shiftKey: true },
        { key: "i", metaKey: true, shiftKey: true },
        // Ctrl/Cmd+Shift+J (Console)
        { key: "j", ctrlKey: true, shiftKey: true },
        { key: "j", metaKey: true, shiftKey: true },
        // Ctrl/Cmd+Shift+C (Inspect element)
        { key: "c", ctrlKey: true, shiftKey: true },
        { key: "c", metaKey: true, shiftKey: true },
        // F12 (DevTools)
        { key: "F12" },
        // Ctrl/Cmd+U (View source)
        { key: "u", ctrlKey: true },
        { key: "u", metaKey: true },
        // Ctrl/Cmd+S (Save page)
        { key: "s", ctrlKey: true },
        { key: "s", metaKey: true },
        // Windows Snipping Tool shortcut: Win+Shift+S
        { key: "S", metaKey: true, shiftKey: true },
        // Alt+PrintScreen
        { key: "PrintScreen", altKey: true },
        // Mac Screenshot: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
        { key: "3", metaKey: true, shiftKey: true },
        { key: "4", metaKey: true, shiftKey: true },
        { key: "5", metaKey: true, shiftKey: true },
      ];

      for (const combo of blockedCombos) {
        const keyMatch = e.key.toLowerCase() === combo.key.toLowerCase();
        const ctrlMatch = combo.ctrlKey !== undefined ? combo.ctrlKey === e.ctrlKey : true;
        const metaMatch = combo.metaKey !== undefined ? combo.metaKey === e.metaKey : true;
        const shiftMatch = combo.shiftKey !== undefined ? combo.shiftKey === e.shiftKey : true;
        const altMatch = combo.altKey !== undefined ? combo.altKey === e.altKey : true;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          e.preventDefault();
          e.stopPropagation();
          showToast("⛔ Action blocked: Screenshot restriction is enabled");
          return false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        // PrintScreen fires on keyup — blur immediately then restore
        blurContent();
        showToast("⛔ Screenshot detected — content protected");
        setTimeout(() => unblurContent(), 1500);
      }
    };

    const handleDevToolsShortcuts = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        showToast("⛔ Developer tools access is restricted");
        return false;
      }
    };

    const handleBlur = () => blurContent();
    const handleFocus = () => unblurContent();

    // Visibility API: blur when tab becomes hidden (covers Alt+Tab screenshot tools)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        blurContent();
      } else {
        // Small delay to ensure content is hidden before any screenshot completes
        setTimeout(() => unblurContent(), 300);
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      preventDefault(e);
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Content is protected.');
      }
      showToast("⛔ Copying is restricted");
    };

    handlersRef.current = {
      preventDefault,
      handleKeyDown,
      handleKeyUp,
      handleDevToolsShortcuts,
      handleBlur,
      handleFocus,
      handleVisibilityChange,
      handleCopy: handleCopy as any,
    };

    // 1. Right-click
    document.addEventListener("contextmenu", preventDefault, true);
    // 2. Keyboard shortcuts
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleDevToolsShortcuts, true);
    document.addEventListener("keyup", handleKeyUp, true);
    // 3. Text selection / drag
    document.addEventListener("selectstart", preventDefault, true);
    document.addEventListener("dragstart", preventDefault, true);
    // 4. Copy / cut
    document.addEventListener("copy", handleCopy as any, true);
    document.addEventListener("cut", preventDefault, true);
    // 5. Window blur/focus (deters screen-recording & Alt+Tab screenshots)
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    // 6. Page Visibility API
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // 7. Print
    window.addEventListener("beforeprint", handleBlur);
    window.addEventListener("afterprint", handleFocus);
    // 8. Mouse Leave (deters some snipping tools)
    document.addEventListener("mouseleave", handleBlur);
    document.addEventListener("mouseenter", handleFocus);

    // 8. CSS-level protection
    const cssStyle = document.createElement("style");
    cssStyle.id = "screenshot-css-protection";
    cssStyle.textContent = `
      /* Prevent CSS print screenshots */
      @media print {
        body * { visibility: hidden !important; }
        body::after {
          visibility: visible !important;
          content: "This content is protected and cannot be printed.";
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
      }
    `;
    document.head.appendChild(cssStyle);

    // 9. Watermark
    addWatermark();

    // 10. Mobile native bridge (Android WebView / iOS WKWebView)
    if (typeof window !== "undefined" && (window as any).MobileBridge) {
      try {
        (window as any).MobileBridge.postMessage("enable_screenshot_restriction");
      } catch (err) {
        console.warn("[ScreenshotRestriction] MobileBridge error:", err);
      }
    }
  };

  const removeRestrictions = () => {
    const h = handlersRef.current;
    if (h) {
      document.removeEventListener("contextmenu", h.preventDefault, true);
      document.removeEventListener("keydown", h.handleKeyDown, true);
      document.removeEventListener("keydown", h.handleDevToolsShortcuts, true);
      document.removeEventListener("keyup", h.handleKeyUp, true);
      document.removeEventListener("selectstart", h.preventDefault, true);
      document.removeEventListener("dragstart", h.preventDefault, true);
      document.removeEventListener("copy", (h as any).handleCopy, true);
      document.removeEventListener("cut", h.preventDefault, true);
      window.removeEventListener("blur", h.handleBlur);
      window.removeEventListener("focus", h.handleFocus);
      document.removeEventListener("visibilitychange", h.handleVisibilityChange);
      window.removeEventListener("beforeprint", h.handleBlur);
      window.removeEventListener("afterprint", h.handleFocus);
      document.removeEventListener("mouseleave", h.handleBlur);
      document.removeEventListener("mouseenter", h.handleFocus);
      handlersRef.current = null;
    }

    unblurContent();
    removeWatermark();

    const cssStyle = document.getElementById("screenshot-css-protection");
    if (cssStyle) cssStyle.remove();

    const toast = document.getElementById("screenshot-toast");
    if (toast) toast.remove();

    // Mobile native bridge
    if (typeof window !== "undefined" && (window as any).MobileBridge) {
      try {
        (window as any).MobileBridge.postMessage("disable_screenshot_restriction");
      } catch (err) {
        console.warn("[ScreenshotRestriction] MobileBridge error:", err);
      }
    }
  };

  useEffect(() => {
    if (!loaded) return;

    if (enabled) {
      applyRestrictions();
    } else {
      removeRestrictions();
    }

    return () => removeRestrictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loaded]);

  return { enabled, loaded };
}

// Client-side component to apply restrictions
export function ScreenshotRestrictionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  useScreenshotRestriction();
  return React.createElement(React.Fragment, null, children);
}
