import React, { useState, useEffect, useRef } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

interface AuthPageProps {
  initialTab?: "login" | "register" | "forgot";
}

export default function AuthPage({ initialTab = "login" }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [humanVerified, setHumanVerified] = useState(false);

  const loginWidgetRef = useRef<HTMLDivElement>(null);
  const registerWidgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowPassword(false);
    setShowRegisterPassword(false);
  }, [activeTab]);

  useEffect(() => {
    if (!document.getElementById("turnstile-script")) {
      const script = document.createElement("script");
      script.id = "turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    setHumanVerified(false);
    const renderWidget = () => {
      const ref = activeTab === "login" ? loginWidgetRef.current : registerWidgetRef.current;
      const id = activeTab === "login" ? "login-turnstile-inner" : "register-turnstile-inner";
      const el = document.getElementById(id);
      if (ref && el && (window as any).turnstile) {
        el.innerHTML = "";
        (window as any).turnstile.render(el, {
          sitekey: "1x00000000000000000000AA",
          callback: () => setHumanVerified(true),
        });
      }
    };
    if ((window as any).turnstile) {
      renderWidget();
    } else {
      const timer = setInterval(() => {
        if ((window as any).turnstile) { renderWidget(); clearInterval(timer); }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent, action: string) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setIsLoading(false);
  };

  const inputClass = `
    w-full h-[46px] border border-border rounded-xl bg-card text-foreground
    outline-none text-[14px] placeholder:text-muted-foreground
    focus:border-primary focus:ring-1 focus:ring-primary transition-colors
  `;

  const TurnstileWidget = ({ widgetId }: { widgetId: string }) => (
    <div className="border border-border rounded-[10px] p-[10px_12px] flex items-center justify-between bg-card">
      <div className="flex items-center gap-3">
        <div
          onClick={() => setHumanVerified(v => !v)}
          className={`w-[22px] h-[22px] border-2 rounded-[4px] flex items-center justify-center cursor-pointer flex-shrink-0 transition-all ${humanVerified ? "border-primary bg-primary" : "border-gray-300 dark:border-gray-600 bg-card"}`}
        >
          {humanVerified && (
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
              <path d="M1.5 5L5 8.5L11.5 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-[14px] text-foreground font-medium">Verify you are human</span>
      </div>
      <div className="flex flex-col items-end gap-[1px]">
        <div className="flex items-center gap-[5px]">
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="14" cy="17" rx="13" ry="5" fill="#F6821F" opacity="0.18" />
            <path d="M14 2C10 2 7 5 7 9c0 2.5 1.2 4.7 3 6l4 3 4-3c1.8-1.3 3-3.5 3-6 0-4-3-7-7-7z" fill="#F6821F" />
            <path d="M10 9c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" fill="#fff" opacity="0.5" />
          </svg>
          <span className="text-[11px] font-bold text-foreground tracking-[0.04em]">CLOUDFLARE</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          <span className="underline cursor-pointer">Privacy</span>
          {" · "}
          <span className="underline cursor-pointer">Terms</span>
        </div>
      </div>
      <div ref={activeTab === "login" ? loginWidgetRef : registerWidgetRef} className="hidden">
        <div id={widgetId} />
      </div>
    </div>
  );

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
    <form onSubmit={e => handleSubmit(e, "login")} className="flex flex-col gap-3">
      <div>
        <FieldLabel text="Email or Phone" />
        <div className="relative">
          <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input type="text" placeholder="Enter your email or phone number" required className={inputClass} style={{ paddingLeft: "44px", paddingRight: "14px" }} />
        </div>
      </div>
      <div>
        <FieldLabel text="Password" />
        <div className="relative">
          <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input type={showPassword ? "text" : "password"} placeholder="Enter your password" required className={inputClass} style={{ paddingLeft: "44px", paddingRight: "44px" }} />
          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-primary p-0 flex">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <TurnstileWidget widgetId="login-turnstile-inner" />
      <SubmitButton label="Login" loadingLabel="Logging in..." />
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={e => handleSubmit(e, "register")} className="flex flex-col gap-3">
      <div>
        <FieldLabel text="Full Name" />
        <div className="relative">
          <User className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input type="text" placeholder="Enter your full name" required className={inputClass} style={{ paddingLeft: "44px", paddingRight: "14px" }} />
        </div>
      </div>
      <div>
        <FieldLabel text="Email or Phone" />
        <div className="relative">
          <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input type="text" placeholder="Enter your email or phone number" required className={inputClass} style={{ paddingLeft: "44px", paddingRight: "14px" }} />
        </div>
      </div>
      <div>
        <FieldLabel text="Password" />
        <div className="relative">
          <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
          <input type={showRegisterPassword ? "text" : "password"} placeholder="Create a password" required className={inputClass} style={{ paddingLeft: "44px", paddingRight: "44px" }} />
          <button type="button" onClick={() => setShowRegisterPassword(v => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-primary p-0 flex">
            {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <TurnstileWidget widgetId="register-turnstile-inner" />
      <SubmitButton label="Create account" loadingLabel="Creating account..." />
    </form>
  );

  const renderForgotForm = () => (
    <form onSubmit={e => handleSubmit(e, "forgot")} className="flex flex-col gap-3">
      {forgotStep === 1 ? (
        <>
          <div>
            <FieldLabel text="Email or Phone" />
            <div className="relative">
              <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
              <input type="text" placeholder="Enter your email or phone number" required className={inputClass} style={{ paddingLeft: "44px", paddingRight: "14px" }} />
            </div>
          </div>
          <SubmitButton label="Send Reset Link" loadingLabel="Sending..." />
        </>
      ) : (
        <>
          <div>
            <FieldLabel text="Verification Code" />
            <input type="text" maxLength={6} placeholder="000000" required className={inputClass} style={{ textAlign: "center", letterSpacing: "0.4em", fontSize: "20px", paddingLeft: "14px", paddingRight: "14px" }} />
          </div>
          <div>
            <FieldLabel text="New Password" />
            <div className="relative">
              <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-70" />
              <input type={showPassword ? "text" : "password"} placeholder="Enter new password" required className={inputClass} style={{ paddingLeft: "44px", paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-primary p-0 flex">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <SubmitButton label="Reset Password" loadingLabel="Resetting..." />
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
          {(["login", "register", "forgot"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-1 border-none rounded-[9px] text-[13px] cursor-pointer transition-all ${activeTab === tab ? "font-semibold bg-primary text-white" : "font-medium text-muted-foreground"}`}
            >
              {tab === "login" ? "Login" : tab === "register" ? "Register" : "Forgot"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div>
          {activeTab === "login" && renderLoginForm()}
          {activeTab === "register" && renderRegisterForm()}
          {activeTab === "forgot" && renderForgotForm()}
        </div>
      </div>
    </div>
  );
}
