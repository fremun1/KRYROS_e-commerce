import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";

interface AuthPageProps {
  initialTab?: "login" | "register" | "forgot";
}

export default function AuthPage({ initialTab = "login" }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);

  const handleTabChange = (tab: "login" | "register" | "forgot") => {
    setActiveTab(tab);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const toggleForgotNewPasswordVisibility = () => {
    setShowForgotNewPassword(!showForgotNewPassword);
  };

  const toggleForgotConfirmPasswordVisibility = () => {
    setShowForgotConfirmPassword(!showForgotConfirmPassword);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Reset link sent!");
    } catch (error) {
      console.error("Forgot password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Password reset successfully!");
    } catch (error) {
      console.error("Forgot password submit error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Email or Phone</label>
        <div className="relative">
          <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            style={{ width: "100%", paddingLeft: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
            required
          />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Password</label>
        <div className="relative">
          <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            style={{ width: "100%", paddingLeft: "44px", paddingRight: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
            required
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", background: "none", border: 0, cursor: "pointer" }}
          >
            {showPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            style={{ width: "16px", height: "16px", accentColor: "var(--kryros-primary)" }}
          />
          <span style={{ marginLeft: "8px", fontSize: "13px", color: "var(--muted-foreground)" }}>Remember me</span>
        </label>
        <button onClick={() => handleTabChange("forgot")} style={{ fontSize: "13px", color: "var(--kryros-primary)", background: "none", border: 0, cursor: "pointer" }}>Forgot password</button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: "100%", height: "48px", border: 0, borderRadius: "10px", fontWeight: 800, fontSize: "14px",
          cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1,
          background: "linear-gradient(90deg, var(--kryros-primary-hover), var(--kryros-primary))",
          color: "#fff"
        }}
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>

      <div style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)" }}>
        <p>Don't have an account? <button onClick={() => handleTabChange("register")} style={{ color: "var(--kryros-primary)", fontWeight: 700, background: "none", border: 0, cursor: "pointer" }}>Register here</button></p>
      </div>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-5">
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Full Name</label>
        <div className="relative">
          <User style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
          <input
            type="text"
            placeholder="Enter your full name"
            style={{ width: "100%", paddingLeft: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
            required
          />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Email or Phone</label>
        <div className="relative">
          <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            style={{ width: "100%", paddingLeft: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
            required
          />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Password</label>
        <div className="relative">
          <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Create a password"
            style={{ width: "100%", paddingLeft: "44px", paddingRight: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
            required
          />
          <button
            type="button"
            onClick={toggleConfirmPasswordVisibility}
            style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", background: "none", border: 0, cursor: "pointer" }}
          >
            {showConfirmPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
          </button>
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Confirm Password</label>
        <div className="relative">
          <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm your password"
            style={{ width: "100%", paddingLeft: "44px", paddingRight: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
            required
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", background: "none", border: 0, cursor: "pointer" }}
          >
            {showPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", background: "var(--muted)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="captcha"
              checked={captchaChecked}
              onChange={(e) => setCaptchaChecked(e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "var(--kryros-primary)", cursor: "pointer" }}
            />
            <label htmlFor="captcha" style={{ fontSize: "13px", color: "var(--muted-foreground)", fontWeight: 600, cursor: "pointer" }}>Verify you are human</label>
          </div>
          <div style={{ textAlign: "right", fontSize: "11px" }}>
            <p style={{ fontWeight: 700, color: "var(--foreground)" }}>CLOUDFLARE</p>
            <div style={{ display: "flex", gap: "4px", color: "var(--muted-foreground)" }}>
              <a href="#" style={{ color: "var(--muted-foreground)" }}>Privacy</a>
              <span>•</span>
              <a href="#" style={{ color: "var(--muted-foreground)" }}>Terms</a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <input
          type="checkbox"
          id="terms"
          checked={termsChecked}
          onChange={(e) => setTermsChecked(e.target.checked)}
          style={{ width: "16px", height: "16px", accentColor: "var(--kryros-primary)", marginTop: "2px" }}
        />
        <label htmlFor="terms" style={{ marginLeft: "8px", fontSize: "13px", color: "var(--muted-foreground)" }}>
          I agree to the <a href="#" style={{ color: "var(--kryros-primary)", fontWeight: 700 }}>Terms and Conditions</a>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading || !captchaChecked || !termsChecked}
        style={{
          width: "100%", height: "48px", border: 0, borderRadius: "10px", fontWeight: 800, fontSize: "14px",
          cursor: (isLoading || !captchaChecked || !termsChecked) ? "not-allowed" : "pointer",
          opacity: (isLoading || !captchaChecked || !termsChecked) ? 0.5 : 1,
          background: "linear-gradient(90deg, var(--kryros-primary-hover), var(--kryros-primary))",
          color: "#fff"
        }}
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>

      <div style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)" }}>
        <p>Already have an account? <button onClick={() => handleTabChange("login")} style={{ color: "var(--kryros-primary)", fontWeight: 700, background: "none", border: 0, cursor: "pointer" }}>Login here</button></p>
      </div>
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

    const handleStep2Submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert("Password reset successfully!");
      } catch (error) {
        console.error("Step 2 error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        {forgotStep === 1 ? (
          <div id="forgot-step-1">
            <div style={{ background: "rgba(6,35,45,0.06)", borderRadius: "10px", padding: "14px", marginBottom: "20px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Email or Phone</label>
                <div className="relative">
                  <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
                  <input
                    type="text"
                    placeholder="Enter your email or phone number"
                    style={{ width: "100%", paddingLeft: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%", height: "48px", border: 0, borderRadius: "10px", fontWeight: 800, fontSize: "14px",
                  cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1,
                  background: "linear-gradient(90deg, var(--kryros-primary-hover), var(--kryros-primary))",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
                {!isLoading && <ArrowRight style={{ width: "16px", height: "16px" }} />}
              </button>

              <div style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)" }}>
                <p>Remember your password? <button onClick={() => handleTabChange("login")} style={{ color: "var(--kryros-primary)", fontWeight: 700, background: "none", border: 0, cursor: "pointer" }}>Login here</button></p>
              </div>
            </form>
          </div>
        ) : (
          <div id="forgot-step-2">
            <div style={{ background: "rgba(6,35,45,0.06)", borderRadius: "10px", padding: "14px", marginBottom: "20px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Check your email for the verification code and enter it below.</p>
            </div>

            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", textAlign: "center", fontSize: "18px", letterSpacing: "8px" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>New Password</label>
                <div className="relative">
                  <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
                  <input
                    type={showForgotNewPassword ? "text" : "password"}
                    placeholder="Create new password"
                    style={{ width: "100%", paddingLeft: "44px", paddingRight: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={toggleForgotNewPasswordVisibility}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", background: "none", border: 0, cursor: "pointer" }}
                  >
                    {showForgotNewPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "8px" }}>Confirm Password</label>
                <div className="relative">
                  <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "var(--kryros-primary)" }} />
                  <input
                    type={showForgotConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    style={{ width: "100%", paddingLeft: "44px", paddingRight: "44px", height: "48px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", color: "var(--foreground)", outline: "none", fontSize: "13px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={toggleForgotConfirmPasswordVisibility}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", background: "none", border: 0, cursor: "pointer" }}
                  >
                    {showForgotConfirmPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%", height: "48px", border: 0, borderRadius: "10px", fontWeight: 800, fontSize: "14px",
                  cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1,
                  background: "linear-gradient(90deg, var(--kryros-primary-hover), var(--kryros-primary))",
                  color: "#fff"
                }}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => setForgotStep(1)}
                style={{
                  width: "100%", height: "48px", border: "2px solid var(--border)", borderRadius: "10px",
                  color: "var(--foreground)", fontWeight: 700, fontSize: "13px", background: "transparent", cursor: "pointer"
                }}
              >
                Back
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "420px", background: "var(--card)", borderRadius: "16px", boxShadow: "0 12px 24px rgba(0,0,0,0.08)", padding: "32px" }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span style={{ color: "var(--foreground)" }}>KRY</span><span style={{ color: "var(--kryros-primary)" }}>ROS</span>
          </h1>
        </div>

        <div style={{ background: "var(--muted)", borderRadius: "10px", padding: "4px", marginBottom: "32px", display: "flex", gap: "4px" }}>
          <button
            onClick={() => handleTabChange("login")}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "8px", fontWeight: 600, fontSize: "13px", transition: "all 0.2s", border: 0,
              cursor: "pointer",
              background: activeTab === "login" ? "var(--kryros-primary)" : "transparent",
              color: activeTab === "login" ? "#fff" : "var(--muted-foreground)"
            }}
          >
            Login
          </button>
          <button
            onClick={() => handleTabChange("register")}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "8px", fontWeight: 600, fontSize: "13px", transition: "all 0.2s", border: 0,
              cursor: "pointer",
              background: activeTab === "register" ? "var(--kryros-primary)" : "transparent",
              color: activeTab === "register" ? "#fff" : "var(--muted-foreground)"
            }}
          >
            Register
          </button>
          <button
            onClick={() => handleTabChange("forgot")}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "8px", fontWeight: 600, fontSize: "13px", transition: "all 0.2s", border: 0,
              cursor: "pointer",
              background: activeTab === "forgot" ? "var(--kryros-primary)" : "transparent",
              color: activeTab === "forgot" ? "#fff" : "var(--muted-foreground)"
            }}
          >
            Forgot
          </button>
        </div>

        <div className="min-h-96">
          {activeTab === "login" && renderLoginForm()}
          {activeTab === "register" && renderRegisterForm()}
          {activeTab === "forgot" && renderForgotPasswordForm()}
        </div>
      </div>
    </div>
  );
}