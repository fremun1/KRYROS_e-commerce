import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

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
      } catch { resolve(""); }
    });
  });
}

type Tab = "login" | "register" | "forgot";

export default function LoginPage() {
  const [activeTab] = useState<Tab>("login");
  const [showPw, setShowPw] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const { login, isLoading, error, clearError, token, user } = useAuthStore();

  useEffect(() => {
    if (token && user) setLocation("/dashboard");
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
    setValidationError(null);

    if (!identifier.trim()) {
      setValidationError("Please enter your email or phone number.");
      return;
    }
    if (!password) {
      setValidationError("Please enter your password.");
      return;
    }

    const captchaToken = await getCaptchaToken("login");
    const result = await login(identifier.trim(), password, captchaToken || undefined);

    if (result.success) {
      setLocation("/dashboard");
    }
  };

  const displayError = validationError || error;

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
                  type="button"
                  onClick={() => {
                    if (tab === "register") { setLocation("/register"); return; }
                    if (tab === "forgot") { setLocation("/forgot-password"); return; }
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

            {displayError && (
              <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                <p className="text-xs font-medium" style={{ color: "#b91c1c" }}>{displayError}</p>
              </div>
            )}

            {/* Email or Phone */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Email or Phone</label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5"
                style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone number"
                  autoComplete="username"
                  required
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "#1a2340" }}
                  data-testid="input-email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Password</label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5"
                style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "#1a2340" }}
                  data-testid="input-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" style={{ color: "#27B9AF" }} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: rememberMe ? "#27B9AF" : "transparent", borderColor: rememberMe ? "#27B9AF" : "#9ca3af" }}>
                  {rememberMe && <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-white stroke-2"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <span className="text-sm" style={{ color: "#6b7280" }}>Remember me</span>
              </label>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
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
                <span className="font-semibold cursor-pointer" style={{ color: "#27B9AF" }}>Register here</span>
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#9ca3af" }}>
          Your payment is safe with{" "}
          <span className="font-bold" style={{ color: "#27B9AF" }}>KRYROS</span>
        </p>
      </div>
    </div>
  );
}
