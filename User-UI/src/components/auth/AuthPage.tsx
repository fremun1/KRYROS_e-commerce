import React, { useState, useEffect, useRef } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

interface AuthPageProps {
  initialTab?: "login" | "register" | "forgot";
}

const TEAL = "#26A69A";

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
    w-full h-[46px] border border-gray-200 rounded-xl bg-white text-gray-800
    outline-none text-[14px] placeholder:text-gray-400
    focus:border-[#26A69A] focus:ring-1 focus:ring-[#26A69A] transition-colors
  `;

  const TurnstileWidget = ({ widgetId }: { widgetId: string }) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          onClick={() => setHumanVerified(v => !v)}
          style={{
            width: "22px",
            height: "22px",
            border: humanVerified ? `2px solid ${TEAL}` : "2px solid #d1d5db",
            borderRadius: "4px",
            background: humanVerified ? TEAL : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          {humanVerified && (
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
              <path d="M1.5 5L5 8.5L11.5 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>Verify you are human</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="14" cy="17" rx="13" ry="5" fill="#F6821F" opacity="0.18" />
            <path d="M14 2C10 2 7 5 7 9c0 2.5 1.2 4.7 3 6l4 3 4-3c1.8-1.3 3-3.5 3-6 0-4-3-7-7-7z" fill="#F6821F" />
            <path d="M10 9c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" fill="#fff" opacity="0.5" />
          </svg>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#1a1a2e", letterSpacing: "0.04em" }}>CLOUDFLARE</span>
        </div>
        <div style={{ fontSize: "10px", color: "#6b7280" }}>
          <span style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy</span>
          {" · "}
          <span style={{ textDecoration: "underline", cursor: "pointer" }}>Terms</span>
        </div>
      </div>
      <div ref={activeTab === "login" ? loginWidgetRef : registerWidgetRef} style={{ display: "none" }}>
        <div id={widgetId} />
      </div>
    </div>
  );

  const SubmitButton = ({ label, loadingLabel }: { label: string; loadingLabel: string }) => (
    <button
      type="submit"
      disabled={isLoading}
      style={{
        width: "100%",
        height: "44px",
        border: "none",
        borderRadius: "10px",
        background: TEAL,
        color: "#fff",
        fontSize: "14px",
        fontWeight: 600,
        cursor: isLoading ? "not-allowed" : "pointer",
        opacity: isLoading ? 0.7 : 1,
        transition: "opacity 0.2s, transform 0.1s",
        letterSpacing: "0.01em",
      }}
    >
      {isLoading ? loadingLabel : label}
    </button>
  );

  const FieldLabel = ({ text }: { text: string }) => (
    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
      {text}
    </label>
  );

  const renderLoginForm = () => (
    <form onSubmit={e => handleSubmit(e, "login")} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <FieldLabel text="Email or Phone" />
        <div style={{ position: "relative" }}>
          <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: TEAL, opacity: 0.7 }} />
          <input type="text" placeholder="Enter your email or phone number" required style={{ paddingLeft: "44px", paddingRight: "14px" }} className={inputClass} />
        </div>
      </div>
      <div>
        <FieldLabel text="Password" />
        <div style={{ position: "relative" }}>
          <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: TEAL, opacity: 0.7 }} />
          <input type={showPassword ? "text" : "password"} placeholder="Enter your password" required style={{ paddingLeft: "44px", paddingRight: "44px" }} className={inputClass} />
          <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TEAL, padding: 0, display: "flex" }}>
            {showPassword ? <EyeOff style={{ width: "20px", height: "20px" }} /> : <Eye style={{ width: "20px", height: "20px" }} />}
          </button>
        </div>
      </div>
      <TurnstileWidget widgetId="login-turnstile-inner" />
      <SubmitButton label="Login" loadingLabel="Logging in..." />
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={e => handleSubmit(e, "register")} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <FieldLabel text="Full Name" />
        <div style={{ position: "relative" }}>
          <User style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: TEAL, opacity: 0.7 }} />
          <input type="text" placeholder="Enter your full name" required style={{ paddingLeft: "44px", paddingRight: "14px" }} className={inputClass} />
        </div>
      </div>
      <div>
        <FieldLabel text="Email or Phone" />
        <div style={{ position: "relative" }}>
          <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: TEAL, opacity: 0.7 }} />
          <input type="text" placeholder="Enter your email or phone number" required style={{ paddingLeft: "44px", paddingRight: "14px" }} className={inputClass} />
        </div>
      </div>
      <div>
        <FieldLabel text="Password" />
        <div style={{ position: "relative" }}>
          <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: TEAL, opacity: 0.7 }} />
          <input type={showRegisterPassword ? "text" : "password"} placeholder="Create a password" required style={{ paddingLeft: "44px", paddingRight: "44px" }} className={inputClass} />
          <button type="button" onClick={() => setShowRegisterPassword(v => !v)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TEAL, padding: 0, display: "flex" }}>
            {showRegisterPassword ? <EyeOff style={{ width: "20px", height: "20px" }} /> : <Eye style={{ width: "20px", height: "20px" }} />}
          </button>
        </div>
      </div>
      <TurnstileWidget widgetId="register-turnstile-inner" />
      <SubmitButton label="Create account" loadingLabel="Creating account..." />
    </form>
  );

  const renderForgotForm = () => (
    <form onSubmit={e => handleSubmit(e, "forgot")} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {forgotStep === 1 ? (
        <>
          <div>
            <FieldLabel text="Email or Phone" />
            <div style={{ position: "relative" }}>
              <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: TEAL, opacity: 0.7 }} />
              <input type="text" placeholder="Enter your email or phone number" required style={{ paddingLeft: "44px", paddingRight: "14px" }} className={inputClass} />
            </div>
          </div>
          <SubmitButton label="Send Reset Link" loadingLabel="Sending..." />
        </>
      ) : (
        <>
          <div>
            <FieldLabel text="Verification Code" />
            <input type="text" maxLength={6} placeholder="000000" required style={{ textAlign: "center", letterSpacing: "0.4em", fontSize: "20px", paddingLeft: "14px", paddingRight: "14px" }} className={inputClass} />
          </div>
          <div>
            <FieldLabel text="New Password" />
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: TEAL, opacity: 0.7 }} />
              <input type={showPassword ? "text" : "password"} placeholder="Enter new password" required style={{ paddingLeft: "44px", paddingRight: "44px" }} className={inputClass} />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TEAL, padding: 0, display: "flex" }}>
                {showPassword ? <EyeOff style={{ width: "20px", height: "20px" }} /> : <Eye style={{ width: "20px", height: "20px" }} />}
              </button>
            </div>
          </div>
          <SubmitButton label="Reset Password" loadingLabel="Resetting..." />
        </>
      )}
    </form>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
      <div style={{ width: "100%", maxWidth: "390px", background: "#fff", borderRadius: "20px", boxShadow: "0 4px 24px rgba(0,0,0,0.09)", padding: "20px 16px 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "-0.3px", lineHeight: 1, margin: 0 }}>
            <span style={{ color: "#1e293b" }}>KRY</span>
            <span style={{ color: TEAL }}>ROS</span>
          </h1>
        </div>

        {/* Tab switcher */}
        <div style={{ background: "#f1f5f9", borderRadius: "12px", padding: "4px", display: "flex", gap: "3px", marginBottom: "18px" }}>
          {(["login", "register", "forgot"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "8px 2px",
                border: "none",
                borderRadius: "9px",
                fontWeight: activeTab === tab ? 600 : 500,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: activeTab === tab ? TEAL : "transparent",
                color: activeTab === tab ? "#fff" : "#64748b",
              }}
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
