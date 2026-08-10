/**
 * themeLoader.ts
 *
 * Fetches the platform's theme color CSS variables from the backend
 * (GET /api/settings/theme) and applies them to document.documentElement
 * so that all --kryros-* CSS variables are updated dynamically.
 *
 * This is called once at app boot time (before the first render) so that
 * the correct brand colors are in place immediately.
 */

import { EFFECTIVE_API_BASE } from './api';

/**
 * Apply a map of { cssVar -> value } to the document root.
 */
function applyThemeColors(colors: Record<string, string>): void {
  const root = document.documentElement;
  for (const [cssVar, value] of Object.entries(colors)) {
    if (cssVar.startsWith('--') && value) {
      root.style.setProperty(cssVar, value);
    }
  }
}

/**
 * Fetch theme colors from the backend and apply them.
 * Silently falls back to the CSS defaults already in index.css if the
 * request fails (e.g. backend not reachable, or first load before DB seeded).
 */
export async function loadThemeFromCMS(): Promise<void> {
  try {
    const url = `${EFFECTIVE_API_BASE}/api/settings/theme`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Short timeout so we don't block the initial render for long
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[themeLoader] GET /api/settings/theme returned ${res.status} — using CSS defaults`);
      return;
    }

    const colors: Record<string, string> = await res.json();
    applyThemeColors(colors);
  } catch (err) {
    // Network error or timeout — silently fall back to CSS defaults
    console.warn('[themeLoader] Could not load theme from CMS, using CSS defaults', err);
  }
}
