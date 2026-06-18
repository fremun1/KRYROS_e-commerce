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
      } catch { resolve(""); }
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

export default function RegisterPage() {
  const [activeTab] = useState<Tab>("register");
  const [showPw, setShowPw] = useState(false);
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
      setValidationError("Password must contain uppercase, lowercase and a number.");
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

  // Combined full name field matching reference image
  const fullName = `${form.firstName} ${form.lastName}`.trim();

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
                    if (tab === "login") { setLocation("/login"); return; }
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

            {/* Full Name — matching reference (single field UI, split internally) */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Full Name</label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5"
                style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                <User className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                <input
                  type="text"
                  value={fullName || ""}
                  onChange={(e) => {
                    const parts = e.target.value.split(" ");
                    const first = parts[0] || "";
                    const last = parts.slice(1).join(" ");
                    setForm({ ...form, firstName: first, lastName: last });
                  }}
                  placeholder="Enter your full name"
                  required
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "#1a2340" }}
                />
              </div>
            </div>

            {/* Email or Phone */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Email or Phone</label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5"
                style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                <input
                  type="text"
                  value={form.email || form.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes("@") || (!val.startsWith("0") && !val.startsWith("+"))) {
                      setForm({ ...form, email: val, phone: "" });
                    } else {
                      setForm({ ...form, phone: val, email: "" });
                    }
                  }}
                  placeholder="Enter your email or phone number"
                  autoComplete="email"
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
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Create a password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
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

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer" onClick={() => setAgreed(!agreed)}>
              <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{ background: agreed ? "#27B9AF" : "transparent", borderColor: agreed ? "#27B9AF" : "#9ca3af" }}>
                {agreed && <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-white stroke-2"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <span className="text-xs" style={{ color: "#6b7280" }}>
                I agree to the{" "}
                <Link href="/terms"><span className="cursor-pointer underline" style={{ color: "#27B9AF" }}>Terms & Conditions</span></Link>
                {" and "}
                <Link href="/privacy"><span className="cursor-pointer underline" style={{ color: "#27B9AF" }}>Privacy Policy</span></Link>
              </span>
            </label>

            {/* Create account button */}
            <button
              type="submit"
              disabled={isLoading || !agreed}
              data-testid="btn-register"
              className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #27B9AF 0%, #1a9e95 100%)" }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
              ) : "Create account"}
            </button>

            <p className="text-center text-xs" style={{ color: "#9ca3af" }}>
              Already have an account?{" "}
              <Link href="/login">
                <span className="font-semibold cursor-pointer" style={{ color: "#27B9AF" }}>Login Now</span>
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
