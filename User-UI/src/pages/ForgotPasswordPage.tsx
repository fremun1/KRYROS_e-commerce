import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { useLocation } from "wouter";
import { EFFECTIVE_API_BASE } from "@/lib/api";

type ForgotPasswordStep = "request" | "reset" | "success";

interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

function evaluatePassword(pw: string): { score: number; checks: PasswordChecks; label: string } {
  const checks: PasswordChecks = {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  let label = "";
  if (pw.length > 0) {
    if (passed <= 2) label = "Weak";
    else if (passed === 3) label = "Fair";
    else if (passed === 4) label = "Good";
    else label = "Strong";
  }
  return { score: passed, checks, label };
}

export default function ForgotPasswordPage() {
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState<ForgotPasswordStep>("request");
  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordEval = evaluatePassword(newPassword);

  // Check if we have a reset token in the URL
  useEffect(() => {
    const search = window.location.search;
    if (search) {
      const params = new URLSearchParams(search);
      const tokenParam = params.get("token");
      if (tokenParam) {
        setToken(tokenParam);
        setStep("reset");
      }
    }
  }, [location]); // Re-run if location changes

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      if (res.ok) {
        setNotice("If an account with that identifier exists, a password reset link has been sent to your email.");
        setIdentifier("");
        // Removed auto-redirect to give user time to read the notice
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to send reset link. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (res.ok) {
        setStep("success");
        setTimeout(() => setLocation("/login"), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to reset password. The link may have expired.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = () =>
    passwordEval.score <= 2 ? "#D63031" : passwordEval.score === 3 ? "#F68B1E" : "#2DBE60";
  const strengthWidth = () => (newPassword.length === 0 ? "0%" : `${(passwordEval.score / 5) * 100}%`);

  const ic =
    "w-full h-[48px] border border-[#E5E5E5] rounded-[10px] bg-[#FAFAFA] text-[#313133] text-[14px] px-[14px] outline-none placeholder:text-[#9E9E9E] font-['Roboto'] focus:border-[#C0151B] focus:bg-white focus:ring-1 focus:ring-[#C0151B]/20 transition-all duration-200";
  const bp =
    "w-full h-[48px] border-none rounded-[10px] bg-[#C0151B] text-white text-[14px] font-bold font-['Roboto'] cursor-pointer tracking-[0.02em] transition-all duration-200 hover:bg-[#A01015] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const lc = "block text-[12px] font-bold text-[#313133] mb-[6px] uppercase tracking-[0.04em] font-['Roboto']";

  const Spinner = () => (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  const Logo = () => (
    <div className="text-center mb-5">
      <h1 className="text-[24px] font-black tracking-[-0.5px] leading-none m-0 font-['Roboto']">
        <span className="text-[#313133]">KRY</span>
        <span className="text-[#C0151B]">ROS</span>
      </h1>
    </div>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-5 left-5 bg-transparent border-none cursor-pointer text-[#75757A] hover:text-[#313133] transition-colors p-1 flex items-center gap-1"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] relative">
        {step !== "request" && <BackButton onClick={() => setLocation("/login")} />}

        <div className="bg-white rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-8">
          <Logo />

          {/* Request Reset Step */}
          {step === "request" && (
            <>
              <p className="text-center text-[13px] text-[#75757A] mb-6 font-['Roboto']">
                Enter your email or phone number to receive a password reset link
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-[8px] text-[13px] leading-snug font-['Roboto'] bg-[#FFF0F0] text-[#D63031] border border-[#FFD0D0]">
                  {error}
                </div>
              )}

              {notice && (
                <div className="mb-4 px-4 py-3 rounded-[8px] text-[13px] leading-snug font-['Roboto'] bg-[#F0F7FF] text-[#344a64] border border-[#D0E0F0]">
                  {notice}
                </div>
              )}

              <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
                <div>
                  <label className={lc}>Email or Phone</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E] pointer-events-none" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="your@email.com or +260..."
                      className={`${ic} pl-12`}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button type="submit" className={bp} disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner /> Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[#E5E5E5] text-center">
                <p className="text-[13px] text-[#75757A] font-['Roboto']">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-[#C0151B] font-medium hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </>
          )}

          {/* Reset Password Step */}
          {step === "reset" && (
            <>
              <p className="text-center text-[13px] text-[#75757A] mb-6 font-['Roboto']">
                Create a new password for your account
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-[8px] text-[13px] leading-snug font-['Roboto'] bg-[#FFF0F0] text-[#D63031] border border-[#FFD0D0]">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <div>
                  <label className={lc}>New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E] pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className={`${ic} pl-12 pr-12`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#9E9E9E] hover:text-[#313133]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[#75757A] font-['Roboto']">Password strength</span>
                        <span
                          className="text-[11px] font-bold font-['Roboto']"
                          style={{ color: strengthColor() }}
                        >
                          {passwordEval.label}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-[#E5E5E5] rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: strengthWidth(), backgroundColor: strengthColor() }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={lc}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E] pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className={`${ic} pl-12 pr-12`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#9E9E9E] hover:text-[#313133]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" className={bp} disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner /> Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-[#2DBE60]" />
                </div>
              </div>
              <h2 className="text-[18px] font-bold text-[#313133] mb-2 font-['Roboto']">Password Reset Successful</h2>
              <p className="text-[13px] text-[#75757A] mb-6 font-['Roboto']">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className={bp}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
