import { useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

interface UseIdleTimeoutOptions {
  /** Called when the idle timeout fires — should trigger logout */
  onIdle: () => void;
  /** Called 2 minutes before logout so a warning modal can be shown */
  onWarning?: () => void;
  /** Override the idle timeout (ms). Default: 30 minutes */
  timeoutMs?: number;
  /** Disable the hook (e.g., on public pages) */
  disabled?: boolean;
}

/**
 * Detects user inactivity and calls onIdle after the configured timeout.
 *
 * Usage:
 *   useIdleTimeout({ onIdle: () => logout(), onWarning: () => setShowWarning(true) });
 *
 * Place this hook in your root authenticated layout component.
 */
export function useIdleTimeout({
  onIdle,
  onWarning,
  timeoutMs = IDLE_TIMEOUT_MS,
  disabled = false,
}: UseIdleTimeoutOptions) {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);

    if (onWarning) {
      warnTimer.current = setTimeout(onWarning, timeoutMs - WARNING_BEFORE_MS);
    }
    idleTimer.current = setTimeout(onIdle, timeoutMs);
  }, [onIdle, onWarning, timeoutMs]);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    resetTimers();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimers, { passive: true });
    });

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [resetTimers, disabled]);
}
