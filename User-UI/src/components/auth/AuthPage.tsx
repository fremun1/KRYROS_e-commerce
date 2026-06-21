import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <label className="block text-sm font-semibold text-gray-900 mb-2">Email or Phone</label>
        <div className="relative">
          <Mail className="fas fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            className="w-full pl-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
        <div className="relative">
          <Lock className="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="w-full pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
            required
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="fas fa-eye-slash" />
            ) : (
              <Eye className="fas fa-eye" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600"
          />
          <span className="ml-2 text-sm text-gray-600">Remember me</span>
        </label>
        <a href="#" className="text-sm text-teal-600 hover:underline">Forgot password</a>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>

      <div className="text-center text-sm text-gray-600">
        <p>Don't have an account? <button onClick={() => handleTabChange("register")} className="text-teal-600 font-semibold hover:underline">Register here</button></p>
      </div>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
        <div className="relative">
          <User className="fas fa-user absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
          <input
            type="text"
            placeholder="Enter your full name"
            className="w-full pl-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Email or Phone</label>
        <div className="relative">
          <Mail className="fas fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
          <input
            type="text"
            placeholder="Enter your email or phone number"
            className="w-full pl-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
        <div className="relative">
          <Lock className="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Create a password"
            className="w-full pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
            required
          />
          <button
            type="button"
            onClick={toggleConfirmPasswordVisibility}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? (
              <EyeOff className="fas fa-eye-slash" />
            ) : (
              <Eye className="fas fa-eye" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
        <div className="relative">
          <Lock className="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm your password"
            className="w-full pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
            required
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="fas fa-eye-slash" />
            ) : (
              <Eye className="fas fa-eye" />
            )}
          </button>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="captcha"
              checked={captchaChecked}
              onChange={(e) => setCaptchaChecked(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-teal-600 cursor-pointer"
            />
            <label htmlFor="captcha" className="text-sm text-gray-700 font-medium cursor-pointer">Verify you are human</label>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-gray-900">CLOUDFLARE</p>
            <div className="flex gap-1 text-gray-600 text-xs">
              <a href="#" className="hover:underline">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:underline">Terms</a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start">
        <input
          type="checkbox"
          id="terms"
          checked={termsChecked}
          onChange={(e) => setTermsChecked(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-teal-600 mt-1"
        />
        <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
          I agree to the <a href="#" className="text-teal-600 font-semibold hover:underline">Terms and Conditions</a>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading || !captchaChecked || !termsChecked}
        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>

      <div className="text-center text-sm text-gray-600">
        <p>Already have an account? <button onClick={() => handleTabChange("login")} className="text-teal-600 font-semibold hover:underline">Login here</button></p>
      </div>
    </form>
  );

  const renderForgotPasswordForm = () => {
    const [step, setStep] = useState(1);

    const handleStep1Submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStep(2);
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
        {step === 1 ? (
          <div id="forgot-step-1">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email or Phone</label>
                <div className="relative">
                  <Mail className="fas fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
                  <input
                    type="text"
                    placeholder="Enter your email or phone number"
                    className="w-full pl-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
                {!isLoading && <ArrowRight className="fas fa-arrow-right" />}
              </button>

              <div className="text-center text-sm text-gray-600">
                <p>Remember your password? <button onClick={() => handleTabChange("login")} className="text-teal-600 font-semibold hover:underline">Login here</button></p>
              </div>
            </form>
          </div>
        ) : (
          <div id="forgot-step-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">Check your email for the verification code and enter it below.</p>
            </div>

            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none text-center text-lg tracking-widest"
                  required
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
                  <input
                    type={showForgotNewPassword ? "text" : "password"}
                    placeholder="Create new password"
                    className="w-full pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={toggleForgotNewPasswordVisibility}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showForgotNewPassword ? (
                      <EyeOff className="fas fa-eye-slash" />
                    ) : (
                      <Eye className="fas fa-eye" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600" />
                  <input
                    type={showForgotConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="w-full pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={toggleForgotConfirmPasswordVisibility}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showForgotConfirmPassword ? (
                      <EyeOff className="fas fa-eye-slash" />
                    ) : (
                      <Eye className="fas fa-eye" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full h-12 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 mt-3"
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
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span className="text-gray-900">KRY</span><span className="text-teal-600">ROS</span>
          </h1>
        </div>

        <div className="bg-gray-100 rounded-lg p-1 mb-8 flex gap-1">
          <button
            onClick={() => handleTabChange("login")}
            className={cn(
              "flex-1 py-2 px-3 rounded-md font-medium transition-all",
              activeTab === "login"
                ? "bg-teal-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Login
          </button>
          <button
            onClick={() => handleTabChange("register")}
            className={cn(
              "flex-1 py-2 px-3 rounded-md font-medium transition-all",
              activeTab === "register"
                ? "bg-teal-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Register
          </button>
          <button
            onClick={() => handleTabChange("forgot")}
            className={cn(
              "flex-1 py-2 px-3 rounded-md font-medium transition-all",
              activeTab === "forgot"
                ? "bg-teal-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            )}
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