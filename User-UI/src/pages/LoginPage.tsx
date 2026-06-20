// /home/workdir/KRYROS_e-commerce-main/User-UI/src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { API_BASE } from "@/lib/api";

const RECAPTCHA_SITE_KEY = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_RECAPTCHA_SITE_KEY ?? "";

async function getCaptchaToken(action: string): Promise<string> {
  if (!RECAPTCHA_SITE_KEY) return "";
  // ... (existing captcha function - kept unchanged)
  const w = window as any;
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

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [, setLocation] = useLocation();
  const { login, isLoading, error, clearError, token, user } = useAuthStore();
  const { items: localWishlistIds } = useWishlistStore();

  useEffect(() => {
    if (token && user) setLocation("/dashboard");
  }, [token, user, setLocation]);

  useEffect(() => { return () => clearError(); }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!identifier || !password) {
      setValidationError("Please enter email/phone and password");
      return;
    }

    const captchaToken = await getCaptchaToken("login");
    const result = await login(identifier, password, captchaToken || undefined);

    if (result.success) {
      setLocation("/dashboard");
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-card rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-border">
          {/* Logo */}
          <div className="pt-10 pb-6 flex justify-center">
            <div className="text-4xl font-black tracking-tighter">
              <span className="text-slate-900 dark:text-white">KRY</span>
              <span className="text-[#27B9AF]">ROS</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 -mt-2 mb-8">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
              {["Login", "Register", "Forgot"].map((tab) => (
                <Link
                  key={tab}
                  href={tab === "Register" ? "/register" : tab === "Forgot" ? "/forgot-password" : "#"}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all text-center ${
                    tab === "Login"
                      ? "bg-[#27B9AF] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </Link>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6">
            {displayError && (
              <div className="flex gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-4 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{displayError}</p>
              </div>
            )}

            {/* Email or Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email or Phone</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone number"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-[#27B9AF] text-base"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-[#27B9AF] text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Cloudflare Verify */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 accent-[#27B9AF]" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Verify you are human</span>
              </div>
              <div className="flex items-center gap-2">
                <img src="https://www.cloudflare.com/favicon.ico" alt="Cloudflare" className="w-6 h-6" />
                <div>
                  <p className="text-xs font-bold text-orange-600">CLOUDFLARE</p>
                  <p className="text-[10px] text-slate-500">Privacy • Terms</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#27B9AF] hover:bg-[#1f9e95] text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.985] disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
            </button>

            <div className="text-center text-sm">
              <Link href="/forgot-password" className="text-[#27B9AF] hover:underline">
                Forgot Password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
