import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle, Loader2, Phone } from "lucide-react";
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

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
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
    setValidationError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setValidationError("Please enter your first and last name.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setValidationError("Please provide at least an email address or phone number.");
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
    if (form.password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setValidationError("Please agree to the Terms & Conditions to continue.");
      return;
    }

    const localIds = [...localWishlistIds];

    // Get reCAPTCHA token silently before submitting
    const captchaToken = await getCaptchaToken("register");

    const result = await register({
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">

          <div className="relative bg-card px-6 pt-5 pb-4 overflow-hidden border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <Link href="/login">
                <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </button>
              </Link>
              <span className="text-lg font-black text-foreground">KRY<span className="text-primary">ROS</span></span>
              <Link href="/login">
                <span className="text-sm text-primary font-semibold cursor-pointer hover:underline">Login</span>
              </Link>
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-black text-foreground mb-1">Create Account</h1>
                <p className="text-xs text-muted-foreground leading-snug">Join KRYROS and enjoy premium shopping experience</p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <img src="/kryros-logo.png" alt="KRYROS" className="w-16 h-16 rounded-2xl shadow-lg" onError={(e) => { (e.target as HTMLImageElement).src = '/kryros-logo.svg'; }} />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3.5 bg-card">
            {displayError && (
              <div className="mt-4 flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">{displayError}</p>
              </div>
            )}

            <div className="pt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name"
                    required
                    className="w-full pl-9 pr-3 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name"
                  required
                  className="w-full px-3 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  data-testid="input-email" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50" />
              </div>
            </div>

            {!form.email.trim() && !form.phone.trim() && (
              <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1.5">
                <span>⚠</span> At least one of email or phone number is required for order notifications.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Create a password"
                  required minLength={8} maxLength={128} autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  data-testid="input-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                <p className="text-[9px] text-muted-foreground">8+ chars · must include uppercase, lowercase &amp; a number</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password"
                  required autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  data-testid="input-confirm-password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer" onClick={() => setAgreed(!agreed)}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${agreed ? "bg-primary border-primary" : "border-border"}`}>
                {agreed && <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-white stroke-2"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <span className="text-xs text-foreground">
                I agree to the{" "}
                <Link href="/terms"><span className="text-primary cursor-pointer hover:underline">Terms & Conditions</span></Link>
                {" "}and{" "}
                <Link href="/privacy"><span className="text-primary cursor-pointer hover:underline">Privacy Policy</span></Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading || !agreed}
              data-testid="btn-register"
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground pb-1">
              Already have an account?{" "}
              <Link href="/login">
                <span className="text-primary font-semibold cursor-pointer hover:underline">Login Now</span>
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
