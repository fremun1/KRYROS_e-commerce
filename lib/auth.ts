import Cookies from "js-cookie";

const USER_KEY = "kryros_admin_user";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

// ── Token functions ───────────────────────────────────────────────────────────
// Tokens are now httpOnly cookies managed entirely by the BFF routes
// (/api/bff/login, /api/bff/refresh, /api/bff/logout) and injected into
// backend requests by proxy.ts — JavaScript can NEVER read them.

/** @deprecated — tokens are httpOnly, managed by BFF. This is a no-op. */
export function setToken(_token: string): void {
  // No-op: httpOnly cookies are set server-side by BFF routes only
}

/** Always returns null — httpOnly cookies are not accessible from JavaScript. */
export function getToken(): string | null {
  return null;
}

/** Clears the legacy client-accessible cookie (migration cleanup) and user data. */
export function removeToken(): void {
  Cookies.remove("kryros_admin_token"); // clear legacy cookie if present
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("kryros_admin_refresh"); // clear old refresh token
  }
}

/** @deprecated — refresh token is now httpOnly, managed by BFF. No-op. */
export function setRefreshToken(_token: string): void {}

/** Always returns null — httpOnly. */
export function getRefreshToken(): string | null { return null; }

/** Clears any legacy refresh token storage. */
export function removeRefreshToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("kryros_admin_refresh");
  }
}

// ── User functions — user profile still stored in localStorage ────────────────
export function setUser(user: AdminUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): AdminUser | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
  }
  return null;
}

/**
 * Authentication is now determined by user presence in storage.
 * The actual token lives in an httpOnly cookie — proxy.ts forwards it to the backend.
 * If the token is expired the first API call returns 401, auto-refresh fires silently.
 */
export function isAuthenticated(): boolean {
  return !!getUser();
}

export function logout(): void {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
