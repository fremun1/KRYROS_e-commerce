import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
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

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ fullName: "", emailOrPhone: "", password: "" });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const { register, isLoading, error, clearError, token, user } = useAuthStore();
  const { items: localWishlistIds, toggleWishlist } = useWishlistStore();

  useEffect(() => {
    if (token && user) setLocation("/dashboard");
  }, [token, user]);

  useEffect(() => {
    return () => clearError();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!form.fullName.trim()) {
      setValidationError("Please enter your full name.");
      return;
    }
    if (!form.emailOrPhone.trim()) {
      setValidationError("Please provide an email address or phone number.");
      return;
    }
    if (form.password.length < 8) {
      setValidationError("Password must be at least 8 characters long.");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      setValidationError("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    const localIds = [...localWishlistIds];
    const captchaToken = await getCaptchaToken("register");

    const isEmail = form.emailOrPhone.includes("@");
    const email = isEmail ? form.emailOrPhone.trim() : "";
    const phone = !isEmail ? form.emailOrPhone.trim() : "";

    const nameParts = form.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const result = await register({
      email,
      password: form.password,
      firstName,
      lastName,
      ...(phone ? { phone } : {}),
    }, captchaToken || undefined);

    if (result.success) {
      const newToken = useAuthStore.getState().token;
      if (newToken && localIds.length > 0) {
        await syncLocalWishlistToServer(newToken, localIds);
        localIds.forEach((id) => toggleWishlist(id));
      }
      setLocation("/dashboard");
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-lg overflow-hidden border border-border">

          {/* Logo */}
          <div className="pt-10 pb-6 flex justify-center">
            <div className="text-4xl font-black tracking-tighter">
              <span className="text-foreground">KRY</span>
              <span className="text-primary">ROS</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 -mt-2 mb-8">
            <div className="flex bg-secondary dark:bg-secondary rounded-2xl p-1.5">
              {["Login", "Register", "Forgot"].map((tab) => (
                <Link
                  key={tab}
                  href={tab === "Login" ? "/login" : tab === "Forgot" ? "/forgot-password" : "#"}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all text-center ${
                    tab === "Register"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </Link>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6">
            {displayError && (
              <div className="flex gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{displayError}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-base font-bold text-foreground mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-base text-foreground placeholder:text-muted-foreground transition-colors"
                  required
                />
              </div>
            </div>

            {/* Email or Phone */}
            <div>
              <label className="block text-base font-bold text-foreground mb-2">Email or Phone</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type="text"
                  value={form.emailOrPhone}
                  onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
                  placeholder="Enter your email or phone number"
                  className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-base text-foreground placeholder:text-muted-foreground transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-base font-bold text-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Create a password"
                  className="w-full pl-12 pr-12 py-4 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-base text-foreground placeholder:text-muted-foreground transition-colors"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile Verify */}
            <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 accent-primary rounded" />
                <span className="text-sm text-foreground">Verify you are human</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="28" height="18" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 0C10.686 0 7.686 1.343 5.515 3.515L0 9l5.515 5.485C7.686 16.657 10.686 18 14 18s6.314-1.343 8.485-3.515L28 9l-5.515-5.485C20.314 1.343 17.314 0 14 0z" fill="#F6821F"/>
                  <path d="M14 4.5C10.962 4.5 8.5 6.962 8.5 10S10.962 15.5 14 15.5 19.5 13.038 19.5 10 17.038 4.5 14 4.5z" fill="#FBAD41"/>
                </svg>
                <div>
                  <p className="text-xs font-bold text-orange-500 leading-none">CLOUDFLARE</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Privacy · Terms</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base rounded-xl transition-all active:scale-[0.985] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
