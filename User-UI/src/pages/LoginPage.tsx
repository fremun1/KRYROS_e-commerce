import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">

          {/* Logo */}
          <div className="pt-10 pb-6 flex justify-center">
            <div className="text-4xl font-black tracking-tighter">
              <span className="text-foreground">KRY</span>
              <span className="text-primary">ROS</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 -mt-2 mb-8">
            <div className="flex bg-secondary rounded-md p-1.5">
              {(["Login", "Register", "Forgot"] as const).map((tab) => (
                <Link
                  key={tab}
                  to={tab === "Register" ? "/auth/register" : tab === "Forgot" ? "/auth/forgot-password" : "#"}
                  className={`flex-1 py-3 text-sm font-semibold rounded transition-all text-center ${
                    tab === "Login"
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
              <div className="flex gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Email or Phone */}
            <div>
              <label className="block text-base font-bold text-foreground mb-2">Email or Phone</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone number"
                  className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-base text-foreground placeholder:text-muted-foreground transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-base font-bold text-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-4 bg-card border border-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-base text-foreground placeholder:text-muted-foreground transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Cloudflare Verify */}
            <div className="flex items-center justify-between bg-card border border-border rounded-md p-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 accent-primary rounded" />
                <span className="text-sm text-foreground">Verify you are human</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
                  <path d="M14 0C10.686 0 7.686 1.343 5.515 3.515L0 9l5.515 5.485C7.686 16.657 10.686 18 14 18s6.314-1.343 8.485-3.515L28 9l-5.515-5.485C20.314 1.343 17.314 0 14 0z" fill="#F6821F"/>
                  <path d="M14 4.5C10.962 4.5 8.5 6.962 8.5 10S10.962 15.5 14 15.5 19.5 13.038 19.5 10 17.038 4.5 14 4.5z" fill="#FBAD41"/>
                </svg>
                <div>
                  <p className="text-xs font-bold text-orange-500 leading-none">CLOUDFLARE</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Privacy · Terms</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base rounded-md transition-all active:scale-[0.985] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
