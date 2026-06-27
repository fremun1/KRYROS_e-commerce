"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getUser, setUser, removeToken, AdminUser } from "@/lib/auth";
import api from "@/lib/api";
import axios from "axios";
import toast from "react-hot-toast";

interface LoginResult {
  success: boolean;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string, captchaToken: string) => Promise<LoginResult>;
  completeTwoFactor: (code: string, twoFactorToken: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  completeTwoFactor: async () => false,
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUserObj = (raw: any, emailFallback: string): AdminUser => ({
    id: raw?.id || raw?._id || raw?.sub || "1",
    name: [raw?.firstName, raw?.lastName].filter(Boolean).join(" ") ||
          raw?.name || raw?.fullName || emailFallback.split("@")[0] || "Admin",
    email: raw?.email || emailFallback,
    role: (raw?.role || "SUPER_ADMIN").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    avatar: raw?.avatar || raw?.profileImage,
  });

  // On mount: restore cached user, then re-hydrate from the server-side session
  // so authenticated users do not lose permissions when localStorage is stale.
  useEffect(() => {
    let cancelled = false;

    const hydrateUser = async () => {
      const storedUser = getUser();
      if (storedUser && !cancelled) {
        setUserState(storedUser);
      }

      try {
        const res = await axios.get("/api/bff/me");
        if (res.data?.authenticated && res.data?.user && !cancelled) {
          const freshUser = buildUserObj(res.data.user, res.data.user?.email || storedUser?.email || "");
          setUser(freshUser);
          setUserState(freshUser);
          return;
        }
      } catch {
        // No valid cookie-backed session. Fall back to stored user if present.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrateUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  // Calls the BFF route which sets httpOnly access + refresh cookies server-side.
  // The response body contains only user data — no tokens are ever sent to JS.
  const login = async (email: string, password: string, captchaToken: string): Promise<LoginResult> => {
    try {
      const res = await axios.post("/api/bff/login", { identifier: email, password, captchaToken });
      const data = res.data;

      // 2FA required — BFF did not set cookies yet, just returning the pending token
      if (data.requiresTwoFactor && data.twoFactorToken) {
        return { success: false, requiresTwoFactor: true, twoFactorToken: data.twoFactorToken };
      }

      if (data.success) {
        const userObj = buildUserObj(data.user, email);
        setUser(userObj);
        setUserState(userObj);
        toast.success("Welcome back!");
        return { success: true };
      }

      toast.error("Login failed");
      return { success: false };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || "Invalid credentials");
      return { success: false };
    }
  };

  // ── 2FA completion ─────────────────────────────────────────────────────────
  // BFF validates the code with the backend and sets httpOnly cookies on success.
  const completeTwoFactor = async (code: string, twoFactorToken: string): Promise<boolean> => {
    try {
      const res = await axios.post("/api/bff/2fa", { code, twoFactorToken });
      const data = res.data;
      if (data.success) {
        const userObj = buildUserObj(data.user, data.user?.email || "");
        setUser(userObj);
        setUserState(userObj);
        toast.success("Welcome back!");
        return true;
      }
      return false;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || "Invalid 2FA code");
      return false;
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  // BFF revokes the refresh token server-side and clears httpOnly cookies.
  const logout = async () => {
    // Fire-and-forget — don't block the UI redirect on network latency
    axios.post("/api/bff/logout").catch(() => {});

    removeToken();          // clears legacy client cookie + user from localStorage
    setUserState(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, completeTwoFactor, logout,
      isAuthenticated: !!user, // authentication = user present; proxy enforces the token
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
