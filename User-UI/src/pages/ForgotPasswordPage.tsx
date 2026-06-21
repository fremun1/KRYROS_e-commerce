import { useState } from "react";
import { Link } from "wouter";
import { Mail, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-lg overflow-hidden border border-border">

          {/* Logo */}
          <div className="pt-10 pb-6 flex justify-center">
            <div className="text-4xl font-black tracking-tighter">
              <span className="text-foreground">KRY</span>
              <span className="text-primary">ROS</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 -mt-2 mb-8">
            <div className="flex bg-secondary dark:bg-secondary rounded-2xl p-1.5">
              {["Login", "Register", "Forgot"].map((tab) => (
                <Link
                  key={tab}
                  href={tab === "Login" ? "/login" : tab === "Register" ? "/register" : "#"}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all text-center ${
                    tab === "Forgot"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </Link>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6">
            {error && (
              <div className="flex gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success ? (
              <div className="text-center py-4 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Check your inbox</h3>
                  <p className="text-sm text-muted-foreground">
                    If an account exists with <span className="font-medium text-foreground">{identifier}</span>, we've sent a password reset link.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-block text-sm text-primary font-semibold hover:underline"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-base font-bold text-foreground mb-2">Email or Phone</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter your email or phone number"
                      className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-base text-foreground placeholder:text-muted-foreground transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base rounded-xl transition-all active:scale-[0.985] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
