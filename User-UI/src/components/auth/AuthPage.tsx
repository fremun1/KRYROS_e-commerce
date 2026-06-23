import React, { useState, useEffect, useRef } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

interface AuthPageProps {
  initialTab?: "login" | "register" | "forgot";
}

export default function AuthPage({ initialTab = "login" }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);

  // Refs for Turnstile widgets
  const loginWidgetRef = useRef<HTMLDivElement>(null);
  const registerWidgetRef = useRef<HTMLDivElement>(null);
  const [loginVerified, setLoginVerified] = useState(false);
  const [registerVerified, setRegisterVerified] = useState(false);

  // Load Turnstile script
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

  // Render Turnstile widgets when tab changes
  useEffect(() => {
    const renderWidget = () => {
      if (activeTab === "login" && loginWidgetRef.current && (window as any).turnstile) {
        (window as any).turnstile.render(loginWidgetRef.current, {
          sitekey: "1x00000000000000000000AA", // Demo sitekey
          callback: (token: string) => setLoginVerified(true),
        });
      } else if (activeTab === "register" && registerWidgetRef.current && (window as any).turnstile) {
        (window as any).turnstile.render(registerWidgetRef.current, {
          sitekey: "1x00000000000000000000AA", // Demo sitekey
          callback: (token: string) => setRegisterVerified(true),
        });
      }
    };

    if ((window as any).turnstile) {
      renderWidget();
    } else {
      const checkTurnstile = setInterval(() => {
        if ((window as any).turnstile) {
          renderWidget();
          clearInterval(checkTurnstile);
        }
      }, 100);
      return () => clearInterval(checkTurnstile);
    }
  }, [activeTab]);

  const handleTabChange = (tab: "login" | "register" | "forgot") => {
    setActiveTab(tab);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleRegisterPasswordVisibility = () => {
    setShowRegisterPassword(!showRegisterPassword);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Login submitted!");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Account created!");
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label className="block text-xl font-bold text-slate-800 mb-3">Email or Phone</label>
        <div className="relative">
          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 text-[var(--kryros-primary)] opacity-60" />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            className="w-full pl-16 pr-4 h-[72px] border-2 border-slate-200 rounded-2xl bg-white text-slate-800 outline-none text-xl placeholder:text-slate-400 focus:border-[var(--kryros-primary)] transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xl font-bold text-slate-800 mb-3">Password</label>
        <div className="relative">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 text-[var(--kryros-primary)] opacity-60" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="w-full pl-16 pr-16 h-[72px] border-2 border-slate-200 rounded-2xl bg-white text-slate-800 outline-none text-xl placeholder:text-slate-400 focus:border-[var(--kryros-primary)] transition-colors"
            required
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--kryros-primary)] bg-transparent border-0 cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
          </button>
        </div>
      </div>

      <div className="py-1">
        <div ref={loginWidgetRef} id="login-turnstile" className="w-full" />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-[72px] border-0 rounded-2xl font-extrabold text-2xl cursor-pointer transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--kryros-primary-hover), var(--kryros-primary))",
          color: "#fff",
          boxShadow: isLoading ? "none" : "0 8px 24px rgba(39,185,175,0.25)",
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-6">
      <div>
        <label className="block text-xl font-bold text-slate-800 mb-3">Full Name</label>
        <div className="relative">
          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 text-[var(--kryros-primary)] opacity-60" />
          <input
            type="text"
            placeholder="Enter your full name"
            className="w-full pl-16 pr-4 h-[72px] border-2 border-slate-200 rounded-2xl bg-white text-slate-800 outline-none text-xl placeholder:text-slate-400 focus:border-[var(--kryros-primary)] transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xl font-bold text-slate-800 mb-3">Email or Phone</label>
        <div className="relative">
          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 text-[var(--kryros-primary)] opacity-60" />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            className="w-full pl-16 pr-4 h-[72px] border-2 border-slate-200 rounded-2xl bg-white text-slate-800 outline-none text-xl placeholder:text-slate-400 focus:border-[var(--kryros-primary)] transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xl font-bold text-slate-800 mb-3">Password</label>
        <div className="relative">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 text-[var(--kryros-primary)] opacity-60" />
          <input
            type={showRegisterPassword ? "text" : "password"}
            placeholder="Create a password"
            className="w-full pl-16 pr-16 h-[72px] border-2 border-slate-200 rounded-2xl bg-white text-slate-800 outline-none text-xl placeholder:text-slate-400 focus:border-[var(--kryros-primary)] transition-colors"
            required
          />
          <button
            type="button"
            onClick={toggleRegisterPasswordVisibility}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--kryros-primary)] bg-transparent border-0 cursor-pointer"
          >
            {showRegisterPassword ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
          </button>
        </div>
      </div>

      <div className="py-1">
        <div ref={registerWidgetRef} id="register-turnstile" className="w-full" />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-[72px] border-0 rounded-2xl font-extrabold text-2xl cursor-pointer transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--kryros-primary-hover), var(--kryros-primary))",
          color: "#fff",
          boxShadow: isLoading ? "none" : "0 8px 24px rgba(39,185,175,0.25)",
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );

  const renderForgotPasswordForm = () => {
    const handleStep1Submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setForgotStep(2);
      } catch (error) {
        console.error("Step 1 error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        {forgotStep === 1 ? (
          <div id="forgot-step-1">
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-3">Email or Phone</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 text-[var(--kryros-primary)] opacity-60" />
                  <input
                    type="text"
                    placeholder="Enter your email or phone number"
                    className="w-full pl-16 pr-4 h-[72px] border-2 border-slate-200 rounded-2xl bg-white text-slate-800 outline-none text-xl placeholder:text-slate-400 focus:border-[var(--kryros-primary)] transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[72px] border-0 rounded-2xl font-extrabold text-2xl cursor-pointer transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, var(--kryros-primary-hover), var(--kryros-primary))",
                  color: "#fff",
                  boxShadow: isLoading ? "none" : "0 8px 24px rgba(39,185,175,0.25)",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        ) : (
          <div id="forgot-step-2">
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-3">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full h-[72px] border-2 border-slate-200 rounded-2xl bg-white text-slate-800 outline-none text-center text-2xl tracking-[0.5em]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[72px] border-0 rounded-2xl font-extrabold text-2xl cursor-pointer transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, var(--kryros-primary-hover), var(--kryros-primary))",
                  color: "#fff",
                  boxShadow: isLoading ? "none" : "0 8px 24px rgba(39,185,175,0.25)",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[500px] bg-white rounded-[28px] shadow-2xl p-10">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-black tracking-tight">
            <span className="text-slate-800">KRY</span><span className="text-[var(--kryros-primary)]">ROS</span>
          </h1>
        </div>

        <div className="bg-slate-100 rounded-2xl p-2 mb-10 flex gap-2">
          <button
            onClick={() => handleTabChange("login")}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-xl transition-all border-0 cursor-pointer"
            style={{
              background: activeTab === "login" ? "var(--kryros-primary)" : "transparent",
              color: activeTab === "login" ? "#fff" : "#64748b",
            }}
          >
            Login
          </button>
          <button
            onClick={() => handleTabChange("register")}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-xl transition-all border-0 cursor-pointer"
            style={{
              background: activeTab === "register" ? "var(--kryros-primary)" : "transparent",
              color: activeTab === "register" ? "#fff" : "#64748b",
            }}
          >
            Register
          </button>
          <button
            onClick={() => handleTabChange("forgot")}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-xl transition-all border-0 cursor-pointer"
            style={{
              background: activeTab === "forgot" ? "var(--kryros-primary)" : "transparent",
              color: activeTab === "forgot" ? "#fff" : "#64748b",
            }}
          >
            Forgot
          </button>
        </div>

        <div className="min-h-[400px]">
          {activeTab === "login" && renderLoginForm()}
          {activeTab === "register" && renderRegisterForm()}
          {activeTab === "forgot" && renderForgotPasswordForm()}
        </div>
      </div>
    </div>
  );
}
