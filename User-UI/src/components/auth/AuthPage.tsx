import React, { useMemo, useState, useEffect } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/authStore";
import { API_BASE } from "@/lib/api";

interface AuthPageProps {
  initialTab?: "login" | "register" | "forgot";
}

export default function AuthPage({ initialTab = "login" }: AuthPageProps) {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [notice, setNotice] = useState<string>("");

  const { login, register, isLoading, error, clearError } = useAuthStore();

  // ── Form state ────────────────────────────────────────────────────────────
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerFullName, setRegisterFullName] = useState("");
  const [registerIdentifier, setRegisterIdentifier] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    setShowPassword(false);
    setShowRegisterPassword(false);
    setNotice("");
    clearError();
  }, [activeTab, clearError]);

  useEffect(() => {
    setActiveTab(initialTab);

    if (initialTab !== "forgot") {
      setForgotStep(1);
      return;
    }

    const tokenFromUrl = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")?.trim() || ""
      : "";

    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setForgotStep(2);
      setNotice("Enter your new password to finish resetting your account.");
      return;
    }

    setForgotStep(1);
  }, [initialTab, location]);

  const parsedRegisterName = useMemo(() => {
    const parts = registerFullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return null;
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }, [registerFullName]);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("");
    const res = await login(loginIdentifier.trim(), loginPassword);
    if (res.success) setLocation("/dashboard");
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("");
    if (!parsedRegisterName) {
      setNotice("Please enter your first name and last name.");
      return;
    }
    const res = await register({
      identifier: registerIdentifier.trim(),
      password: registerPassword,
      firstName: parsedRegisterName.firstName,
      lastName: parsedRegisterName.lastName,
    });
    if (res.success) setLocation("/dashboard");
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("");

    // Step 1: request reset token email/SMS
    if (forgotStep === 1) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            Array.isArray(data.message) ? data.message.join(", ") : data.message || "Failed to send reset link.";
          setNotice(msg);
          return;
        }
        setNotice("If an account exists, a reset token has been sent. Paste the token below to reset your password.");
        setForgotStep(2);
      } catch {
        setNotice("Network error. Please check your connection.");
      }
      return;
    }

    // Step 2: reset password using token
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken.trim(), newPassword: resetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          Array.isArray(data.message) ? data.message.join(", ") : data.message || "Password reset failed.";
        setNotice(msg);
        return;
      }
      setNotice("Password reset successful. You can now log in.");
      setResetToken("");
      setResetPassword("");
      setForgotIdentifier("");
      setForgotStep(1);
      setLocation("/login");
      setActiveTab("login");
    } catch {
      setNotice("Network error. Please check your connection.");
    }
  };

  const inputClass = `
    w-full h-[46px] border border-border rounded-xl bg-card text-foreground
    outline-none text-[14px] placeholder:text-muted-foreground
    focus:border-primary focus:ring-1 focus:ring-primary transition-colors
  `;

  const SubmitButton = ({ label, loadingLabel }: { label: string; loadingLabel: string }) => (
    <button
      type="submit"
      disabled={isLoading}
      className="w-full h-[44px] border-none rounded-[10px] bg-primary text-white text-[14px] font-semibold transition-opacity transition-transform active:scale-95 letter-spacing-[0.01em] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? loadingLabel : label}
    </button>
  );

  const FieldLabel = ({ text }: { text: string }) => (
    <label className="block text-[13px] font-bold text-foreground mb-[6px]">
      {text}
    </label>
  );

  const renderLoginForm = () => (
    <form onSubmit={submitLogin} className="flex flex-col gap-3">
      <div>
        <FieldLabel text="Email or Phone" />
        <div className="relative">
          <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            required
            value={loginIdentifier}
            onChange={(e) => setLoginIdentifier(e.target.value)}
            className={inputClass}
            style={{ paddingLeft: "44px", paddingRight: "14px" }}
          />
        </div>
      </div>
      <div>
        <FieldLabel text="Password" />
        <div className="relative">
          <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            required
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className={inputClass}
            style={{ paddingLeft: "44px", paddingRight: "44px" }}
          />
          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-primary p-0 flex">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <SubmitButton label="Login" loadingLabel="Logging in..." />
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={submitRegister} className="flex flex-col gap-3">
      <div>
        <FieldLabel text="Full Name" />
        <div className="relative">
          <User className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input
            type="text"
            placeholder="Enter your full name"
            required
            value={registerFullName}
            onChange={(e) => setRegisterFullName(e.target.value)}
            className={inputClass}
            style={{ paddingLeft: "44px", paddingRight: "14px" }}
          />
        </div>
      </div>
      <div>
        <FieldLabel text="Email or Phone" />
        <div className="relative">
          <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            required
            value={registerIdentifier}
            onChange={(e) => setRegisterIdentifier(e.target.value)}
            className={inputClass}
            style={{ paddingLeft: "44px", paddingRight: "14px" }}
          />
        </div>
      </div>
      <div>
        <FieldLabel text="Password" />
        <div className="relative">
          <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input
            type={showRegisterPassword ? "text" : "password"}
            placeholder="Create a password"
            required
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            className={inputClass}
            style={{ paddingLeft: "44px", paddingRight: "44px" }}
          />
          <button type="button" onClick={() => setShowRegisterPassword(v => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-primary p-0 flex">
            {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 mb-0">
          Password must be at least 8 characters and include uppercase, lowercase, and a number.
        </p>
      </div>
      <SubmitButton label="Create account" loadingLabel="Creating account..." />
    </form>
  );

  const renderForgotForm = () => (
    <form onSubmit={submitForgot} className="flex flex-col gap-3">
      {forgotStep === 1 ? (
        <>
          <div>
            <FieldLabel text="Email or Phone" />
            <div className="relative">
              <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
              <input
                type="text"
                placeholder="Enter your email or phone number"
                required
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                className={inputClass}
                style={{ paddingLeft: "44px", paddingRight: "14px" }}
              />
            </div>
          </div>
          <SubmitButton label="Send Reset Link" loadingLabel="Sending..." />
        </>
      ) : (
        <>
          <div>
            <FieldLabel text="Reset Token" />
            <input
              type="text"
              placeholder="Paste the token from your email/SMS"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              className={inputClass}
              style={{ paddingLeft: "14px", paddingRight: "14px" }}
            />
          </div>
          <div>
            <FieldLabel text="New Password" />
            <div className="relative">
              <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                required
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className={inputClass}
                style={{ paddingLeft: "44px", paddingRight: "44px" }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-primary p-0 flex">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <SubmitButton label="Reset Password" loadingLabel="Resetting..." />
          <button
            type="button"
            onClick={() => setForgotStep(1)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors text-left"
          >
            Back
          </button>
        </>
      )}
    </form>
  );

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-3">
      <div className="w-full max-w-[390px] bg-card rounded-[20px] shadow-lg p-5 pb-6">
        {/* Logo */}
        <div className="text-center mb-4">
          <h1 className="text-[26px] font-black tracking-[-0.3px] leading-none m-0">
            <span className="text-foreground">KRY</span>
            <span className="text-primary">ROS</span>
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="bg-muted rounded-[12px] p-1 flex gap-[3px] mb-[18px]">
          {(["login", "register", "forgot"] as const).map(tab => {
            const route = tab === "login" ? "/login" : tab === "register" ? "/register" : "/forgot-password";
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  if (tab !== "forgot") {
                    setForgotStep(1);
                    setResetToken("");
                    setResetPassword("");
                  }
                  setLocation(route);
                }}
                className={`flex-1 py-2 px-1 border-none rounded-[9px] text-[13px] cursor-pointer transition-all ${activeTab === tab ? "font-semibold bg-primary text-white" : "font-medium text-muted-foreground"}`}
              >
                {tab === "login" ? "Login" : tab === "register" ? "Register" : "Forgot"}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div>
          {(notice || error) && (
            <div className="mb-3 text-[12px] leading-snug">
              {error && <p className="m-0 text-red-500 font-medium">{error}</p>}
              {notice && <p className={`m-0 ${error ? "text-muted-foreground mt-1" : "text-muted-foreground"}`}>{notice}</p>}
            </div>
          )}
          {activeTab === "login" && renderLoginForm()}
          {activeTab === "register" && renderRegisterForm()}
          {activeTab === "forgot" && renderForgotForm()}
        </div>
      </div>
    </div>
  );
}
