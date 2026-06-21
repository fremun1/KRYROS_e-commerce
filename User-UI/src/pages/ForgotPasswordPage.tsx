import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Tab = "login" | "register" | "forgot";

export default function ForgotPasswordPage() {
  const [activeTab] = useState<Tab>("forgot");
  const [step, setStep] = useState<1 | 2>(1);
  const [, setLocation] = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!identifier.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setStep(2);
    } catch {
      setError("Network error. Please check your connection.");
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!resetToken.trim()) {
      setError("Please enter the reset code sent to you.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError("Password must contain uppercase, lowercase and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken.trim(), newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Invalid or expired reset code.");
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => setLocation("/login"), 1500);
    } catch {
      setError("Network error. Please check your connection.");
      setIsLoading(false);
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
                  type="button"
                  onClick={() => {
                    if (tab === "login") { setLocation("/login"); return; }
                    if (tab === "register") { setLocation("/register"); return; }
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

          {/* STEP 1: request reset */}
          {step === 1 && (
            <form onSubmit={handleSendReset} className="px-5 pb-6 space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                <p className="text-xs font-medium" style={{ color: "#1e40af" }}>
                  Enter your email address and we'll send you a code to reset your password.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                  <p className="text-xs font-medium" style={{ color: "#b91c1c" }}>{error}</p>
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

              {/* Send Reset Link */}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="btn-send-reset"
                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #27B9AF 0%, #1a9e95 100%)" }}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs" style={{ color: "#9ca3af" }}>
                Remember your password?{" "}
                <Link href="/login">
                  <span className="font-semibold cursor-pointer" style={{ color: "#27B9AF" }}>Login here</span>
                </Link>
              </p>
            </form>
          )}

          {/* STEP 2: enter code + new password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="px-5 pb-6 space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <p className="text-xs font-medium" style={{ color: "#15803d" }}>
                  Check your email for the verification code and enter it below.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                  <p className="text-xs font-medium" style={{ color: "#b91c1c" }}>{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#16a34a" }} />
                  <p className="text-xs font-medium" style={{ color: "#15803d" }}>{success}</p>
                </div>
              )}

              {/* Verification Code */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="000000"
                  required
                  className="w-full text-center text-lg tracking-widest border rounded-2xl px-4 py-3.5 outline-none"
                  style={{ borderColor: "#e5e7eb", background: "#fff", color: "#1a2340" }}
                  data-testid="input-reset-code"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>New Password</label>
                <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5"
                  style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                  <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create new password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                    className="flex-1 text-sm outline-none bg-transparent"
                    style={{ color: "#1a2340" }}
                    data-testid="input-new-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" style={{ color: "#27B9AF" }} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#1a2340" }}>Confirm Password</label>
                <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5"
                  style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                  <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "#27B9AF" }} />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    className="flex-1 text-sm outline-none bg-transparent"
                    style={{ color: "#1a2340" }}
                    data-testid="input-confirm-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" style={{ color: "#27B9AF" }} />}
                  </button>
                </div>
              </div>

              {/* Reset Password */}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="btn-reset-password"
                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #27B9AF 0%, #1a9e95 100%)" }}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                ) : "Reset Password"}
              </button>

              {/* Back */}
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="w-full py-4 rounded-2xl font-semibold text-sm border-2 transition-all active:scale-95"
                style={{ borderColor: "#e5e7eb", color: "#374151" }}
              >
                Back
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#9ca3af" }}>
          Your payment is safe with{" "}
          <span className="font-bold" style={{ color: "#27B9AF" }}>KRYROS</span>
        </p>
      </div>
    </div>
  );
}
