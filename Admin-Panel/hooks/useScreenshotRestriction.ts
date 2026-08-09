"use client";
import { useEffect, useState } from "react";
import React from "react";
import api from "@/lib/api";

export function useScreenshotRestriction() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch setting from backend
  useEffect(() => {
    let cancelled = false;
    const fetchSetting = async () => {
      try {
        const res = await api.get("/api/settings");
        const settings = Array.isArray(res.data?.data) ? res.data.data : [];
        const setting = settings.find((s: any) => s.key === "admin_screenshot_restriction_enabled");
        const value = setting?.value || "false";
        if (!cancelled) setEnabled(value === "true");
      } catch {
        // Silently fail - default to disabled
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    fetchSetting();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!enabled || !loaded) {
      // Clean up restrictions when disabled
      removeRestrictions();
      return;
    }

    applyRestrictions();
    return () => removeRestrictions();
  }, [enabled, loaded]);

  const applyRestrictions = () => {
    // 1. Disable right-click context menu
    document.addEventListener("contextmenu", preventDefault, true);

    // 2. Disable common screenshot/copy keyboard shortcuts
    document.addEventListener("keydown", handleKeyDown, true);

    // 3. Disable text selection and drag
    document.addEventListener("selectstart", preventDefault, true);
    document.addEventListener("dragstart", preventDefault, true);

    // 4. Disable copy/cut
    document.addEventListener("copy", preventDefault, true);
    document.addEventListener("cut", preventDefault, true);

    // 5. Add visual indicator (watermark) - optional
    addWatermark();

    // 6. Detect PrintScreen key (limited browser support)
    document.addEventListener("keyup", handleKeyUp, true);

    // 7. Blur content when window loses focus (deters screen recording)
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // 8. Disable Developer Tools shortcuts
    document.addEventListener("keydown", handleDevToolsShortcuts, true);
  };

  const removeRestrictions = () => {
    document.removeEventListener("contextmenu", preventDefault, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("selectstart", preventDefault, true);
    document.removeEventListener("dragstart", preventDefault, true);
    document.removeEventListener("copy", preventDefault, true);
    document.removeEventListener("cut", preventDefault, true);
    document.removeEventListener("keyup", handleKeyUp, true);
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("keydown", handleDevToolsShortcuts, true);
    removeWatermark();
    // Remove blur overlay if exists
    const overlay = document.getElementById("screenshot-blur-overlay");
    if (overlay) overlay.remove();
  };

  const preventDefault = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Block common screenshot and dev tools shortcuts
    const blockedCombos: Array<{
      key: string;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
    }> = [
      // Print Screen
      { key: "PrintScreen", altKey: false },
      // Ctrl+P (Print)
      { key: "p", ctrlKey: true, altKey: false },
      // Ctrl+Shift+I (DevTools)
      { key: "i", ctrlKey: true, shiftKey: true, altKey: false },
      // Ctrl+Shift+J (Console)
      { key: "j", ctrlKey: true, shiftKey: true, altKey: false },
      // Ctrl+Shift+C (Inspect)
      { key: "c", ctrlKey: true, shiftKey: true, altKey: false },
      // F12 (DevTools)
      { key: "F12", altKey: false },
      // Ctrl+U (View Source)
      { key: "u", ctrlKey: true, altKey: false },
      // Ctrl+S (Save Page)
      { key: "s", ctrlKey: true, altKey: false },
      // Meta key variants (Mac)
      { key: "p", metaKey: true, altKey: false },
      { key: "i", metaKey: true, shiftKey: true, altKey: false },
      { key: "j", metaKey: true, shiftKey: true, altKey: false },
      { key: "c", metaKey: true, shiftKey: true, altKey: false },
      { key: "u", metaKey: true, altKey: false },
      { key: "s", metaKey: true, altKey: false },
    ];

    for (const combo of blockedCombos) {
      const keyMatch = e.key.toLowerCase() === combo.key.toLowerCase();
      const ctrlMatch = (combo.ctrlKey ?? false) === e.ctrlKey;
      const metaMatch = (combo.metaKey ?? false) === e.metaKey;
      const shiftMatch = (combo.shiftKey ?? false) === e.shiftKey;
      const altMatch = (combo.altKey ?? false) === e.altKey;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        e.preventDefault();
        e.stopPropagation();
        showToast("Action blocked: Screenshot restriction is enabled");
        return false;
      }
    }
  };

  const handleDevToolsShortcuts = (e: KeyboardEvent) => {
    // Additional F12 detection
    if (e.key === "F12") {
      e.preventDefault();
      showToast("Developer tools access is restricted");
      return false;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // PrintScreen key detection (limited support)
    if (e.key === "PrintScreen") {
      // On some browsers, this fires after the screenshot is taken
      // We can at least blur the content
      blurContent();
      setTimeout(() => unblurContent(), 100);
      showToast("Screenshot detected and blocked");
    }
  };

  const handleBlur = () => {
    // Blur content when window loses focus (deters screen recording)
    blurContent();
  };

  const handleFocus = () => {
    // Unblur when window regains focus
    unblurContent();
  };

  let blurOverlay: HTMLDivElement | null = null;

  const blurContent = () => {
    if (blurOverlay) return;
    blurOverlay = document.createElement("div");
    blurOverlay.id = "screenshot-blur-overlay";
    blurOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, sans-serif;
      font-size: 18px;
      pointer-events: none;
    `;
    blurOverlay.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
        <div style="font-weight: 600; margin-bottom: 8px;">Content Protected</div>
        <div style="font-size: 14px; opacity: 0.8;">Screenshot restriction is active</div>
      </div>
    `;
    document.body.appendChild(blurOverlay);
  };

  const unblurContent = () => {
    if (blurOverlay) {
      blurOverlay.remove();
      blurOverlay = null;
    }
  };

  let watermarkContainer: HTMLDivElement | null = null;

  const addWatermark = () => {
    if (watermarkContainer) return;
    watermarkContainer = document.createElement("div");
    watermarkContainer.id = "screenshot-watermark";
    watermarkContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999998;
      overflow: hidden;
      opacity: 0.03;
    `;
    
    // Create diagonal repeating watermark
    const text = "KRYROS ADMIN • CONFIDENTIAL";
    const angle = -20;
    const spacingX = 250;
    const spacingY = 150;
    
    for (let y = -spacingY; y < window.innerHeight + spacingY; y += spacingY) {
      for (let x = -spacingX; x < window.innerWidth + spacingX; x += spacingX) {
        const mark = document.createElement("div");
        mark.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          transform: rotate(${angle}deg);
          white-space: nowrap;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          user-select: none;
        `;
        mark.textContent = text;
        watermarkContainer.appendChild(mark);
      }
    }
    document.body.appendChild(watermarkContainer);
  };

  const removeWatermark = () => {
    if (watermarkContainer) {
      watermarkContainer.remove();
      watermarkContainer = null;
    }
  };

  const showToast = (message: string) => {
    // Simple toast without external dependency
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
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Add animation styles if not present
    if (!document.getElementById("screenshot-toast-styles")) {
      const style = document.createElement("style");
      style.id = "screenshot-toast-styles";
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    setTimeout(() => {
      toast.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  return { enabled, loaded };
}

// Client-side component to apply restrictions
export function ScreenshotRestrictionGuard({ children }: { children: React.ReactNode }) {
  useScreenshotRestriction();
  return React.createElement(React.Fragment, null, children);
}
