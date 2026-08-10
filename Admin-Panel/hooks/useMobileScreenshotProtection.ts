"use client";
import { useEffect, useRef } from "react";

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export function useMobileScreenshotProtection(enabled: boolean) {
  const handlersRef = useRef<any>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

    const existing = document.getElementById("mobile-protection-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "mobile-protection-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f1f1f;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: mobileToastIn 0.3s ease-out;
      max-width: 90vw;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    if (!document.getElementById("mobile-protection-toast-styles")) {
      const style = document.createElement("style");
      style.id = "mobile-protection-toast-styles";
      style.textContent = `
        @keyframes mobileToastIn {
          from { transform: translateX(-50%) translateY(100px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    toastTimeoutRef.current = setTimeout(() => {
      toast.style.animation = "mobileToastIn 0.3s ease-out reverse";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  const applyMobileProtections = () => {
    if (!isMobileDevice()) return;

    const handlers: any = {};

    // 1. Prevent long-press (context menu)
    handlers.preventLongPress = (e: TouchEvent) => {
      e.preventDefault();
      showToast("⛔ Long-press is disabled");
      return false;
    };

    // 2. Prevent pinch-to-zoom
    handlers.preventPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        showToast("⛔ Pinch zoom is disabled");
      }
    };

    // 3. Prevent gesture (iOS)
    handlers.preventGesture = (e: any) => {
      if (e.type === "gesturestart") {
        e.preventDefault();
        showToast("⛔ Gesture is disabled");
      }
    };

    // 4. Blur on visibility change (screen lock/app switch)
    handlers.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        blurScreen();
      } else {
        setTimeout(() => unblurScreen(), 500);
      }
    };

    // 5. Blur on window blur (app switch)
    handlers.handleWindowBlur = () => blurScreen();
    handlers.handleWindowFocus = () => unblurScreen();

    handlersRef.current = handlers;

    // Apply event listeners with passive: false for preventDefault to work
    document.addEventListener("touchstart", handlers.preventLongPress, {
      passive: false,
    });
    document.addEventListener("touchend", handlers.preventLongPress, {
      passive: false,
    });
    document.addEventListener("touchmove", handlers.preventPinch, {
      passive: false,
    });
    document.addEventListener("gesturestart", handlers.preventGesture, {
      passive: false,
    });
    document.addEventListener("visibilitychange", handlers.handleVisibilityChange);
    window.addEventListener("blur", handlers.handleWindowBlur);
    window.addEventListener("focus", handlers.handleWindowFocus);

    // Apply CSS protections
    applyMobileCSS();
  };

  const blurScreen = () => {
    const existing = document.getElementById("mobile-blur-overlay");
    if (existing) return;

    const overlay = document.createElement("div");
    overlay.id = "mobile-blur-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;padding:20px;user-select:none;-webkit-user-select:none;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        <div style="font-weight:600;margin-bottom:8px;font-size:18px;">Content Protected</div>
        <div style="font-size:14px;opacity:0.8;">Screenshot restriction is active</div>
      </div>
    `;
    document.body.appendChild(overlay);
  };

  const unblurScreen = () => {
    const overlay = document.getElementById("mobile-blur-overlay");
    if (overlay) overlay.remove();
  };

  const applyMobileCSS = () => {
    const existing = document.getElementById("mobile-css-protection");
    if (existing) return;

    const style = document.createElement("style");
    style.id = "mobile-css-protection";
    style.textContent = `
      /* Disable text selection and context menu */
      body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-user-drag: none;
        -webkit-text-size-adjust: 100%;
      }

      /* Disable selection on all elements */
      * {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }

      /* Disable long-press menu on images and links */
      img, a, button, input, textarea {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }

      /* Disable pinch zoom */
      body {
        touch-action: manipulation;
      }

      /* Prevent iOS screenshot notification */
      @supports (-webkit-app-region: drag) {
        body {
          -webkit-user-select: none;
        }
      }

      /* Disable share sheet on iOS */
      html {
        -webkit-user-select: none;
        user-select: none;
      }

      /* Prevent save image option */
      img {
        -webkit-user-drag: none;
        pointer-events: none;
      }

      /* Mobile print protection */
      @media print {
        body * {
          visibility: hidden !important;
        }
        body::after {
          visibility: visible !important;
          content: "This content is protected and cannot be captured.";
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 20px;
          font-weight: bold;
          color: #333;
          text-align: center;
        }
      }

      /* Watermark for deterrent */
      body::before {
        content: "KRYROS ADMIN • CONFIDENTIAL";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-20deg);
        font-size: 24px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.03);
        pointer-events: none;
        z-index: 1;
        white-space: nowrap;
        width: 200%;
      }
    `;
    document.head.appendChild(style);
  };

  const removeMobileProtections = () => {
    const h = handlersRef.current;
    if (h) {
      document.removeEventListener("touchstart", h.preventLongPress);
      document.removeEventListener("touchend", h.preventLongPress);
      document.removeEventListener("touchmove", h.preventPinch);
      document.removeEventListener("gesturestart", h.preventGesture);
      document.removeEventListener("visibilitychange", h.handleVisibilityChange);
      window.removeEventListener("blur", h.handleWindowBlur);
      window.removeEventListener("focus", h.handleWindowFocus);
      handlersRef.current = null;
    }

    unblurScreen();

    const cssStyle = document.getElementById("mobile-css-protection");
    if (cssStyle) cssStyle.remove();

    const toast = document.getElementById("mobile-protection-toast");
    if (toast) toast.remove();

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  };

  useEffect(() => {
    if (!enabled || !isMobileDevice()) return;

    applyMobileProtections();

    return () => removeMobileProtections();
  }, [enabled]);
}
