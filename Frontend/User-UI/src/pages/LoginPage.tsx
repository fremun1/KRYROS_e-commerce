import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { API_BASE } from "@/lib/api";

const RECAPTCHA_SITE_KEY = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_RECAPTCHA_SITE_KEY ?? "";

async function getCaptchaToken(action: string): Promise<string> {
  if (!RECAPTCHA_SITE_KEY) return "";
  const w = window as unknown as {
    grecaptcha?: { ready: (fn: () => void) => void; execute: (k: string, o: { action: string }) => Promise<string> };
  };
  if (!w.grecaptcha) return "";
  return new Promise((resolve) => {
    w.grecaptcha!.ready(async () => {
      try {
        const t = await w.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action });
        resolve(t);
      } catch {
        resolve("");
      }
    });
  });
}

async function syncLocalWishlistToServer(token: string, localIds: string[]) {
  if (!localIds.length) return;
  await Promise.allSettled(
    localIds.map((productId) =>
      fetch(`${API_BASE}/api/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId }),
      })
    )
  );
}

type Tab = "login" | "register" | "forgot";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [, setLocation] = useLocation();
  const search = useSearch();

  const { login, isLoading, error, clearError, token, user } = useAuthStore();
  const { items: localWishlistIds, toggleWishlist } = useWishlistStore();

  const redirectTo = (() => {
    const params = new URLSearchParams(search);
    return params.get("redirect") || "/dashboard";
  })();

  useEffect(() => {
    if (token && user) setLocation(redirectTo);
  }, [token, user]);

  useEffect(() => { return () => clearError(); }, []);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (!document.querySelector(`script[src*="recaptcha"]`)) {
      const script = document.createElement("script");
      const recaptchaUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_RECAPTCHA_URL || "https://www.google.com/recaptcha/api.js";
      script.src = `${recaptchaUrl}?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      document.head.appendChild(script);
    }
    return () => {
      document.querySelectorAll(".grecaptcha-badge").forEach((el) => el.remove());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    const localIds = [...localWishlistIds];
    const captchaToken = await getCaptchaToken("login");
    const result = await login(identifier.trim(), password, captchaToken || undefined);
    if (result.success) {
      if ((window as any).MobileBridge) (window as any).MobileBridge.postMessage("user_logged_in");
      const newToken = useAuthStore.getState().token;
      if (newToken && localIds.length > 0) {
        await syncLocalWishlistToServer(newToken, localIds);
        localIds.forEach((id) => toggleWishlist(id));
      }
      setLocation(redirectTo);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#f0f4f8" }}>
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Logo */}
          <div className="pt-8 pb-2 flex justify-center">
            <Link href="/">
              <span className="text-3xl font-black tracking-tight cursor-pointer select-none">
                <span style={{ color: "#1a2340" }}>KRY</span><span style={{ color: "#27B9AF" }}>ROS</span>
              </span>
            </Link>
          </div>

          {/* Tab switcher */}
          <div className="mx-5 mt-5 mb-5">
            <div className="flex rounded-2xl overflow-hidden" style={{ background: "#f0f4f8" }}>
              {(["login", "register", "forgot"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === "register") { setLocation("/register"); return; }
                    if (tab === "forgot") { setLocation("/forgot-password"); return; }
                    setActiveTab(tab);
                  }}
                  className="flex-1 py-3 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: activeTab === tab ? "#27B9AF" : "transparent",
                    color: activeTab === tab ? "#fff" : "#6b7280",
                    borderRadius: "14px",
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                <p className="text-xs font-medium" style={{ color: "#b91c1c" }}>{error}</p>
              </div>
            )}

            {/* Email or Phone */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Email or Phone</label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5 transition-all"
                style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone number"
                  required
                  autoComplete="username"
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "#1a2340" }}
                  data-testid="input-email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Password</label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5 transition-all"
                style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "#1a2340" }}
                  data-testid="input-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" style={{ color: "#27B9AF" }} />}
                </button>
              </div>
            </div>

            {/* Cloudflare-style verify widget */}
            <div className="flex items-center justify-between border rounded-2xl px-4 py-3.5"
              style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 rounded" style={{ borderColor: "#9ca3af" }} />
                <span className="text-sm" style={{ color: "#374151" }}>Verify you are human</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <svg viewBox="0 0 512 512" className="w-6 h-6" fill="none">
                    <ellipse cx="256" cy="256" rx="256" ry="256" fill="#F38020"/>
                    <path d="M327 180c-8-36-39-62-76-62-30 0-57 17-70 43-3-1-6-1-9-1-33 0-59 27-59 60 0 2 0 4 1 6h4c0-1 0-3 0-4 0-30 24-55 54-55 4 0 8 0 12 1l7 2 3-6c11-23 35-38 62-38 32 0 60 22 67 53l2 8 8-1c22 0 40 18 40 40 0 21-17 38-39 40v4c27-2 47-25 47-52 0-28-21-50-49-50l-5 0z" fill="white"/>
                  </svg>
                  <div>
                    <p className="text-[10px] font-bold" style={{ color: "#374151" }}>CLOUDFLARE</p>
                    <p className="text-[9px]" style={{ color: "#9ca3af" }}>
                      <span className="underline cursor-pointer">Privacy</span>
                      {" · "}
                      <span className="underline cursor-pointer">Terms</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading || !identifier.trim() || !password}
              data-testid="btn-login"
              className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #27B9AF 0%, #1a9e95 100%)" }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Logging in...</>
              ) : "Login"}
            </button>

            <p className="text-center text-xs" style={{ color: "#9ca3af" }}>
              Don't have an account?{" "}
              <Link href="/register">
                <span className="font-semibold cursor-pointer" style={{ color: "#27B9AF" }}>Register Now</span>
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-4" style={{ color: "#9ca3af" }}>
          Your payment is safe with{" "}
          <span className="font-bold" style={{ color: "#27B9AF" }}>KRYROS</span>
        </p>
      </div>
    </div>
  );
}
