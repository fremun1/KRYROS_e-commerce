import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, Headphones, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { API_BASE } from "@/lib/api";

// reCAPTCHA v3 site key (baked in at build time via VITE_RECAPTCHA_SITE_KEY)
const RECAPTCHA_SITE_KEY = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_RECAPTCHA_SITE_KEY ?? "";

/** Execute reCAPTCHA v3 silently and return a token. Returns "" if not configured. */
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

export default function LoginPage() {
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
    if (token && user) {
      setLocation(redirectTo);
    }
  }, [token, user]);

  useEffect(() => {
    return () => clearError();
  }, []);

  // Load reCAPTCHA v3 script on mount; remove badge on unmount
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (!document.querySelector(`script[src*="recaptcha"]`)) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
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
    // Get reCAPTCHA token silently before submitting
    const captchaToken = await getCaptchaToken("login");
    const result = await login(identifier.trim(), password, captchaToken || undefined);
    if (result.success) {
      // Trigger mobile bridge if running in WebView
      if ((window as any).MobileBridge) {
        (window as any).MobileBridge.postMessage('user_logged_in');
      }
      const newToken = useAuthStore.getState().token;
      if (newToken && localIds.length > 0) {
        await syncLocalWishlistToServer(newToken, localIds);
        localIds.forEach((id) => toggleWishlist(id));
      }
      setLocation(redirectTo);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">

          <div className="relative bg-card px-6 pt-6 pb-5 overflow-hidden border-b border-border">
            <Link href="/">
              <img src="/kryros-logo.png" alt="KRYROS" className="h-12 w-12 cursor-pointer" onError={(e) => { (e.target as HTMLImageElement).src = '/kryros-logo.svg'; }} />
            </Link>
            <h1 className="text-2xl font-black text-foreground mt-4 mb-1 whitespace-nowrap">Welcome Back</h1>
            <p className="text-xs text-muted-foreground">Login to continue shopping with KRYROS</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 bg-card">

            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Email or Phone Number
                <span className="text-muted-foreground font-normal ml-1 text-[10px]">(use either to log in)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone number"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <Link href="/forgot-password">
                  <span className="text-xs text-primary cursor-pointer hover:underline font-medium">Forgot Password?</span>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  data-testid="input-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim() || !password}
              data-testid="btn-login"
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Logging in...</>
              ) : (
                "Login"
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground pb-1">
              {"Don't have an account? "}
              <Link href="/register">
                <span className="text-primary font-semibold cursor-pointer hover:underline">Register Now</span>
              </Link>
            </p>

            {RECAPTCHA_SITE_KEY && (
              <p className="text-center text-[10px] text-muted-foreground/60 pb-1">
                Protected by reCAPTCHA.{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">Privacy</a>
                {" · "}
                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline">Terms</a>
              </p>
            )}
          </form>

          <div className="flex items-center justify-around px-6 py-4 border-t border-border bg-muted/30">
            {[
              { icon: ShieldCheck, title: "Secure & Safe", sub: "Your data is protected" },
              { icon: Zap, title: "Fast & Easy", sub: "Quick access to your account" },
              { icon: Headphones, title: "24/7 Support", sub: "We're here to help" },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="text-center">
                <Icon className="w-4 h-4 text-primary mx-auto mb-0.5" />
                <p className="text-[9px] font-bold text-foreground">{title}</p>
                <p className="text-[8px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
