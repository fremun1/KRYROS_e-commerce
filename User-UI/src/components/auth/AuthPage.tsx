import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock, User, Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/authStore";
import { EFFECTIVE_API_BASE } from "@/lib/api";

type AuthStep =
  | "identifier"
  | "checking"
  | "login"
  | "register-password"
  | "register-details"
  | "register-otp"
  | "success";

interface PasswordChecks {
  length: boolean; uppercase: boolean; lowercase: boolean;
  number: boolean; special: boolean;
}

const OTP_LENGTH = 6;
const OTP_COUNTDOWN = 60;
const COUNTRY_CODES = [
  { code: "+260", iso: "ZM", label: "Zambia +260" },
  { code: "+234", iso: "NG", label: "Nigeria +234" },
  { code: "+254", iso: "KE", label: "Kenya +254" },
  { code: "+256", iso: "UG", label: "Uganda +256" },
  { code: "+255", iso: "TZ", label: "Tanzania +255" },
  { code: "+27",  iso: "ZA", label: "South Africa +27" },
  { code: "+233", iso: "GH", label: "Ghana +233" },
  { code: "+1",   iso: "US", label: "USA/Canada +1" },
  { code: "+44",  iso: "GB", label: "UK +44" },
];

function normalizeIdentifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("@")) return trimmed.toLowerCase();
  const np = trimmed.replace(/[^\d+]/g, "");
  if (np.startsWith("+")) return "+" + np.slice(1).replace(/\D/g, "");
  return np.replace(/\D/g, "");
}

function formatPhoneNumberWithCountryCode(phone: string, countryCode: string): string {
  const cleanedPhone = phone.replace(/\D/g, ""); // Remove all non-digits
  const cleanedCountryCode = countryCode.replace(/\D/g, ""); // Remove all non-digits from country code
  
  // If phone already starts with country code (with or without +), return as is
  if (cleanedPhone.startsWith(cleanedCountryCode)) {
    return "+" + cleanedPhone;
  }
  
  // Otherwise, prepend country code
  return "+" + cleanedCountryCode + cleanedPhone;
}

function evaluatePassword(pw: string): { score: number; checks: PasswordChecks; label: string } {
  const checks: PasswordChecks = {
    length: pw.length >= 8, uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw), number: /[0-9]/.test(pw),
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

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [step, setStep] = useState<AuthStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+260");
  const [selectedIso, setSelectedIso] = useState("ZM");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [notice, setNotice] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkFallback, setCheckFallback] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const passwordEval = evaluatePassword(password);
  const active = localLoading || isLoading;

  useEffect(() => { setNotice(""); clearError(); }, [step, clearError]);
  useEffect(() => { if (step === "register-otp" && countdown === 0) setCountdown(OTP_COUNTDOWN); }, [step, countdown]);
  useEffect(() => {
    if (countdown <= 0) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setCountdown((prev) => { if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; } return prev - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);
  useEffect(() => { if (step === "register-otp" && otpRefs.current[0]) otpRefs.current[0].focus(); }, [step]);
  const goTo = useCallback((s: AuthStep) => setStep(s), []);

  const handleCheckIdentifier = async () => {
    if (!identifier.trim()) { setNotice("Please enter your email or phone."); return; }
    setNotice(""); setLocalLoading(true); setStep("checking");
    const normalized = normalizeIdentifier(identifier);
    try {
      const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: normalized }),
      });
      if (res.status === 404) { setCheckFallback(true); goTo("identifier"); setLocalLoading(false); return; }
      if (res.ok) { const data = await res.json(); goTo(data.exists ? "login" : "register-password"); }
      else { setCheckFallback(true); goTo("identifier"); }
    } catch { setCheckFallback(true); goTo("identifier"); }
    finally { setLocalLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setNotice("Please enter your password."); return; }
    setNotice("");
    const res = await login(normalizeIdentifier(identifier), password);
    if (res.success) setLocation("/dashboard");
  };

  const handlePasswordContinue = () => {
    setNotice("");
    if (!password) { setNotice("Please create a password."); return; }
    if (password.length < 8) { setNotice("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setNotice("Passwords do not match."); return; }
    goTo("register-details");
  };

  const handleRegisterAndSendOTP = async () => {
    setNotice("");
    if (!firstName.trim() || !lastName.trim()) { setNotice("Please enter your first and last name."); return; }
    
    // Zambia Requirement: Phone is mandatory
    const isZambia = selectedIso === "ZM";
    if (isZambia && !phone.trim()) {
      setNotice("For Zambia registration, a phone number is mandatory for SMS verification.");
      return;
    }

    setLocalLoading(true);
    try {
      // Determine the identifier to use for OTP
      let finalIdentifier = identifier;
      let phoneToSend = null;
      
      if (!identifier.includes("@")) {
        // User registered with phone number - format with country code
        finalIdentifier = formatPhoneNumberWithCountryCode(identifier, countryCode);
        phoneToSend = finalIdentifier;
      } else if (isZambia && phone) {
        // Zambia user with email - use phone for OTP
        finalIdentifier = formatPhoneNumberWithCountryCode(phone, countryCode);
        phoneToSend = finalIdentifier;
      } else if (phone) {
        // Non-Zambia user with email - still format phone if provided
        phoneToSend = formatPhoneNumberWithCountryCode(phone, countryCode);
      }
      
      const normalizedFinal = normalizeIdentifier(finalIdentifier);
      
      // Send OTP with country detection
      const otpRes = await fetch(`${EFFECTIVE_API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: normalizedFinal,
          countryCode: selectedIso,
          // Pass the other identifier so backend can store both in PendingRegistration
          email: identifier.includes("@") ? normalizeIdentifier(identifier) : null,
          phone: phoneToSend
        })
      });
      
      if (otpRes.ok) {
        // If identifier changed (e.g. from email to phone for Zambia), update state
        if (finalIdentifier !== identifier) {
          setIdentifier(finalIdentifier);
        }
      }
      
      if (!otpRes.ok) {
        const data = await otpRes.json().catch(() => ({}));
        setLocalLoading(false);
        setNotice(data.message || "Failed to send verification code.");
        return;
      }
      
      const otpData = await otpRes.json();
      setNotice(`OTP sent via ${otpData.otpChannel === 'email' ? 'email' : 'SMS'} to ${otpData.destination}`);
      goTo("register-otp");
    } catch { setNotice("Network error."); }
    finally { setLocalLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) { setNotice("Please enter the complete 6-digit code."); return; }
    setNotice(""); setLocalLoading(true);
    try {
      const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: normalizeIdentifier(identifier),
          code,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dob
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Set session and redirect to dashboard
        useAuthStore.getState().setSession(data.user, data.accessToken, data.refreshToken);
        goTo("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice(data.message || "Invalid code.");
      }
    } catch { setNotice("Network error."); }
    finally { setLocalLoading(false); }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setNotice(""); setLocalLoading(true);
    try {
      // Format identifier with country code if it's a phone number
      const formattedIdentifier = identifier.includes('@') 
        ? normalizeIdentifier(identifier) 
        : formatPhoneNumberWithCountryCode(identifier, countryCode);
      
      const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: normalizeIdentifier(formattedIdentifier),
          countryCode: countryCode.replace('+', '')
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCountdown(OTP_COUNTDOWN);
        setNotice(`A new code has been sent via ${data.otpChannel === 'email' ? 'email' : 'SMS'}.`);
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice(data.message || "Failed to resend code.");
      }
    } catch { setNotice("Network error."); }
    finally { setLocalLoading(false); }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value.slice(-1); setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };
  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };
  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const newOtp = [...Array(OTP_LENGTH).fill("")];
    pasted.split("").forEach((char, i) => { if (i < OTP_LENGTH) newOtp[i] = char; });
    setOtp(newOtp);
    const last = Math.min(pasted.length, OTP_LENGTH) - 1;
    if (last >= 0) otpRefs.current[last]?.focus();
  };

  const strengthColor = () => passwordEval.score <= 2 ? 'var(--kryros-error)' : passwordEval.score === 3 ? 'var(--kryros-warning)' : 'var(--kryros-success)';
  const strengthWidth = () => password.length === 0 ? "0%" : `${(passwordEval.score / 5) * 100}%`;

  // Dynamic CSS-based styling matching Jumia aesthetics perfectly
  const ic = "w-full h-[48px] border border-[var(--kryros-border)] rounded-[8px] bg-[var(--kryros-card-bg)] text-[var(--kryros-primary-text)] text-[14px] px-[14px] outline-none placeholder:text-[var(--kryros-disabled-text)] font-['Roboto'] focus:border-[var(--kryros-primary)] focus:ring-4 focus:ring-[var(--kryros-primary)]/10 transition-all duration-200";
  const bp = "w-full h-[48px] border-none rounded-[8px] bg-[var(--kryros-primary)] text-white text-[14.5px] font-bold font-['Roboto'] cursor-pointer tracking-[0.02em] transition-all duration-200 hover:bg-[var(--kryros-primary-hover)] active:scale-[0.98] disabled:bg-[var(--kryros-disabled-btn)] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const bn = "w-full h-[48px] border-none rounded-[8px] bg-[var(--kryros-secondary)] text-white text-[14.5px] font-bold font-['Roboto'] cursor-pointer tracking-[0.02em] transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:bg-[var(--kryros-disabled-btn)] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const lc = "block text-[12px] font-bold text-[var(--kryros-primary-text)] mb-[6px] uppercase tracking-[0.04em] font-['Roboto']";

  const Spinner = () => (
    <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  const Logo = () => (
    <img
      src="/kryros-logo.png"
      alt="KRYROS"
      className="w-[36px] h-[36px] object-contain"
      loading="eager"
    />
  );

  const SupportFooter = () => (
    <div className="text-center pt-3 pb-1 font-['Roboto'] shrink-0">
      <p className="text-[11px] text-[var(--kryros-form-text-muted)] leading-relaxed">
        Need help? Visit our <a href="#" className="text-[var(--kryros-primary)] font-medium hover:underline">Help Center</a> or contact us on
      </p>
      <p className="text-[12px] font-bold mt-0.5" style={{ color:'var(--kryros-primary-text)' }}>
        +260966423719
      </p>
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--kryros-form-text-label)]">KRYROS</span>
      </div>
    </div>
  );

  const NoticeBanner = () => {
    const msg = notice || error; if (!msg) return null;
    const isErr = !!error;
    return <div className="mb-4 px-4 py-3 rounded-[8px] text-[13px] leading-snug font-['Roboto']" style={isErr ? { background:'var(--kryros-form-error-bg)', color:'var(--kryros-error)', border:'1px solid var(--kryros-form-error-border)' } : { background:'var(--kryros-form-info-bg)', color:'var(--kryros-secondary)', border:'1px solid var(--kryros-form-info-border)' }}>{msg}</div>;
  };

  const ShownEmail = ({ onEdit }: { onEdit: () => void }) => (
    <div className="bg-[var(--kryros-form-bg)] border border-[var(--kryros-form-border)] rounded-[8px] px-4 py-2.5 mb-3.5 flex items-center justify-between font-['Roboto']">
      <span className="text-[14px] truncate flex-1 font-medium" style={{ color:'var(--kryros-primary-text)' }}>{identifier}</span>
      <button type="button" onClick={onEdit} className="text-[var(--kryros-primary)] text-[12px] font-bold bg-transparent border-none cursor-pointer hover:underline ml-2 shrink-0 font-['Roboto']">Edit</button>
    </div>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} className="absolute top-5 left-1 bg-transparent border-none cursor-pointer transition-colors p-1 flex items-center gap-1" style={{ color:'var(--kryros-secondary-text)' }} onMouseEnter={e=>(e.currentTarget.style.color='var(--kryros-primary-text)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--kryros-secondary-text)')}>
      <ArrowLeft className="w-5 h-5" />
    </button>
  );

  const GoogleIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const FacebookIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
    </svg>
  );

  const renderIdentifierStep = () => (
    <div className="flex flex-col">
      <div className="text-center mb-3.5">
        <h2 className="text-[20px] font-extrabold font-['Roboto'] tracking-tight" style={{ color:'var(--kryros-primary-text)' }}>Welcome to KRYROS</h2>
        <p className="text-[13px] text-[var(--kryros-form-text-muted)] mt-1 font-['Roboto']">
          {checkFallback ? "Let's get you set up" : "Use your email or phone to log in or sign up."}
        </p>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className={lc}>Email or Mobile Number*</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setCheckFallback(false); }}
            placeholder="Enter your email or phone"
            className={ic}
            autoFocus
            autoComplete="email"
          />
        </div>

        {!checkFallback ? (
          <>
            <button
              type="button"
              onClick={handleCheckIdentifier}
              disabled={active || !identifier.trim()}
              className={bp}
            >
              {active ? <Spinner /> : "Continue"}
            </button>

            <div className="flex items-center gap-3 py-0.5 mt-0.5">
              <div className="flex-grow h-px bg-[var(--kryros-form-strength-bar-bg)]" />
              <span className="text-[11px] text-[var(--kryros-form-text-hint)] uppercase tracking-[0.05em] font-['Roboto']">or log in with</span>
              <div className="flex-grow h-px bg-[var(--kryros-form-strength-bar-bg)]" />
            </div>

            <div className="flex flex-col gap-2.5 my-0.5">
              <button
                type="button"
                className="w-full h-[48px] border rounded-[8px] flex items-center justify-center gap-2.5 text-[14px] font-medium transition-colors cursor-pointer font-['Roboto']" style={{ borderColor:'var(--kryros-border)', background:'var(--kryros-card-bg)', color:'var(--kryros-primary-text)' }}
              >
                <FacebookIcon />
                Log in with Facebook
              </button>
              <button
                type="button"
                className="w-full h-[48px] border rounded-[8px] flex items-center justify-center gap-2.5 text-[14px] font-medium transition-colors cursor-pointer font-['Roboto']" style={{ borderColor:'var(--kryros-border)', background:'var(--kryros-card-bg)', color:'var(--kryros-primary-text)' }}
              >
                <GoogleIcon />
                Login with Google
              </button>
            </div>

            <p className="text-center text-[11.5px] text-[var(--kryros-form-text-muted)] leading-relaxed font-['Roboto'] pt-1 px-2">
              By continuing you agree to KRYROS's <a href="#" className="text-[var(--kryros-primary)] hover:underline font-medium">Terms and Conditions</a> & <a href="#" className="text-[var(--kryros-primary)] hover:underline font-medium">Privacy Policy</a>
            </p>
          </>
        ) : (
          <>
            <p className="text-center text-[13px] text-[var(--kryros-form-text-muted)] mb-2 font-['Roboto']">Is this a new or existing account?</p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => goTo("login")}
                disabled={!identifier.trim()}
                className={bn}
              >
                <Lock className="w-4 h-4" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => goTo("register-password")}
                disabled={!identifier.trim()}
                className={bp}
              >
                <User className="w-4 h-4" /> Create Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderLoginStep = () => (
    <form onSubmit={handleLogin} className="flex flex-col">
      <div className="text-center mb-3.5">
        <h2 className="text-[20px] font-extrabold font-['Roboto'] tracking-tight" style={{ color:'var(--kryros-primary-text)' }}>Welcome back!</h2>
        <p className="text-[13px] text-[var(--kryros-form-text-muted)] mt-1 font-['Roboto']">Enter your password to sign in.</p>
      </div>

      <ShownEmail onEdit={() => goTo("identifier")} />

      <div className="space-y-3.5">
        <div>
          <label className={lc}>Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={ic}
              style={{ paddingRight: "44px" }}
              autoFocus
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex" style={{ color:'var(--kryros-secondary-text)' }}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLocation("/forgot-password")}
          className="self-start text-[12.5px] text-[var(--kryros-primary)] font-bold hover:underline bg-transparent border-none cursor-pointer font-['Roboto']"
        >
          Forgot password?
        </button>

        <button type="submit" disabled={active} className={bp}>
          {active ? <Spinner /> : "Sign In"}
        </button>
      </div>
    </form>
  );

  const renderRegisterPasswordStep = () => (
    <div className="flex flex-col">
      <div className="text-center mb-3.5">
        <h2 className="text-[20px] font-extrabold font-['Roboto'] tracking-tight" style={{ color:'var(--kryros-primary-text)' }}>Create your account</h2>
        <p className="text-[13px] text-[var(--kryros-form-text-muted)] mt-1 font-['Roboto']">Secure your account with a strong password.</p>
      </div>

      <ShownEmail onEdit={() => goTo("identifier")} />

      <div className="space-y-3.5">
        <div>
          <label className={lc}>Create Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={ic}
              style={{ paddingRight: "44px" }}
              autoFocus
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex" style={{ color:'var(--kryros-secondary-text)' }}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold" style={{ color: strengthColor() }}>
                  {passwordEval.label}
                </span>
              </div>
              <div className="h-[4px] bg-[var(--kryros-form-strength-bar-bg)] rounded-[2px] overflow-hidden">
                <div className="h-full rounded-[2px] transition-all duration-300" style={{ width: strengthWidth(), backgroundColor: strengthColor() }} />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={lc}>Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={ic}
              style={{ paddingRight: "44px" }}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex" style={{ color:'var(--kryros-secondary-text)' }}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11.5px] text-[var(--kryros-error)] mt-1 font-['Roboto'] font-medium">Passwords do not match</p>
          )}
        </div>

        <button
          type="button"
          onClick={handlePasswordContinue}
          disabled={active || !password || password !== confirmPassword}
          className={bp}
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="flex flex-col">
      <div className="text-center mb-3.5">
        <h2 className="text-[20px] font-extrabold font-['Roboto'] tracking-tight" style={{ color:'var(--kryros-primary-text)' }}>Personal details</h2>
        <p className="text-[13px] text-[var(--kryros-form-text-muted)] mt-1 font-['Roboto']">We just need you to fill in some details.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className={lc}>First Name*</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            className={ic}
            autoFocus
            autoComplete="given-name"
          />
        </div>

        <div>
          <label className={lc}>Last Name*</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            className={ic}
            autoComplete="family-name"
          />
        </div>

        <div>
          <label className={lc}>Date of Birth*</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className={ic}
            required
          />
        </div>

        <div>
          <label className={lc}>Phone Number {selectedIso === "ZM" ? "(Zambia: mandatory)" : "(Optional)"}</label>
          <div className="flex gap-2 h-[48px]">
            <div className="relative w-[100px] shrink-0">
              <select
                value={countryCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setCountryCode(val);
                  const found = COUNTRY_CODES.find(c => c.code === val);
                  if (found) setSelectedIso(found.iso);
                }}
                className={`${ic} w-full pr-8 appearance-none cursor-pointer text-center px-2 font-bold`}
              >
                {COUNTRY_CODES.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--kryros-form-text-muted)]">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="Phone number"
              className={`${ic} flex-1`}
              autoComplete="tel"
            />
          </div>
        </div>

        {/* Mandatory Consent Checkbox */}
        <div className="flex items-start gap-2.5 pt-0.5 pb-0.5 select-none cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={() => {}} // handled by click on outer div
            className="w-[18px] h-[18px] rounded border-[var(--kryros-form-border)] text-[var(--kryros-primary)] focus:ring-[var(--kryros-primary)] shrink-0 mt-0.5 cursor-pointer accent-[var(--kryros-primary)]"
          />
          <p className="text-[11.5px] text-[var(--kryros-form-text-muted)] leading-relaxed font-['Roboto']">
            I agree to KRYROS's <a href="#" className="text-[var(--kryros-primary)] hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>Terms and Conditions</a> & <a href="#" className="text-[var(--kryros-primary)] hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegisterAndSendOTP}
          disabled={active || !firstName.trim() || !lastName.trim() || !dob || !acceptedTerms}
          className={bp}
        >
          {active ? <Spinner /> : "Continue"}
        </button>
      </div>
    </div>
  );

  const renderOTPStep = () => {
    const isEmail = identifier.includes("@");
    return (
      <div className="flex flex-col">
        <div className="text-center mb-3.5">
          <h2 className="text-[20px] font-extrabold font-['Roboto'] tracking-tight" style={{ color:'var(--kryros-primary-text)' }}>
            {isEmail ? "Verify your email" : "Verify your phone number"}
          </h2>
          <p className="text-[13px] text-[var(--kryros-form-text-muted)] mt-1 font-['Roboto']">We have sent a verification code to</p>
          <p className="text-[14px] font-bold mt-0.5 font-['Roboto']" style={{ color:'var(--kryros-primary-text)' }}>{identifier}</p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2 justify-between" onPaste={handleOTPPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOTPChange(i, e.target.value)}
                onKeyDown={(e) => handleOTPKeyDown(i, e)}
                className="w-[48px] h-[54px] border rounded-[8px] text-center text-[22px] font-bold font-['Roboto'] outline-none focus:ring-4 focus:ring-[var(--kryros-primary)]/10 transition-all duration-200" style={{ borderColor:'var(--kryros-border)', color:'var(--kryros-primary-text)', background:'var(--kryros-secondary-bg)' }}
                autoFocus={i === 0}
              />
            ))}
          </div>



          <div className="text-center py-0.5">
            {countdown > 0 ? (
              <span className="text-[12.5px] text-[var(--kryros-form-text-muted)] font-['Roboto']">
                Resend code in <strong style={{ color:'var(--kryros-primary-text)' }}>{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={active}
                className="text-[12.5px] text-[var(--kryros-primary)] font-bold hover:underline bg-transparent border-none cursor-pointer font-['Roboto']"
              >
                Resend code
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={active || otp.some((d) => !d)}
            className={bp}
          >
            {active ? <Spinner /> : "Submit"}
          </button>
        </div>
      </div>
    );
  };

  const successRedirected = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (step === "success" && !successRedirected.current) {
      successRedirected.current = true;
      timer = setTimeout(() => setLocation("/dashboard"), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step, setLocation]);

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center text-center">
      <div className="w-[64px] h-[64px] bg-[var(--kryros-success)] rounded-full flex items-center justify-center mb-3 shadow-sm animate-bounce">
        <Check className="w-8 h-8 text-white" strokeWidth={3} />
      </div>
      <h2 className="text-[20px] font-extrabold mb-1 font-['Roboto'] tracking-tight" style={{ color:'var(--kryros-primary-text)' }}>Account created! 🎉</h2>
      <p className="text-[13px] text-[var(--kryros-form-text-muted)] mb-0.5 font-['Roboto']">Your KRYROS account is ready.</p>
      <p className="text-[12px] text-[var(--kryros-form-text-hint)] mb-4 font-['Roboto']">Redirecting to your dashboard...</p>

      <button
        type="button"
        onClick={() => setLocation("/dashboard")}
        className={bp}
      >
        Continue Shopping
      </button>
    </div>
  );

  const renderChecking = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner />
      <p className="text-[14.5px] font-medium text-[var(--kryros-form-text-muted)] mt-5 font-['Roboto'] animate-pulse">Checking your account...</p>
    </div>
  );

  const renderCurrentStepContent = () => {
    switch (step) {
      case "identifier":
        return renderIdentifierStep();
      case "login":
        return renderLoginStep();
      case "register-password":
        return renderRegisterPasswordStep();
      case "register-details":
        return renderDetailsStep();
      case "register-otp":
        return renderOTPStep();
      case "success":
        return renderSuccessStep();
      case "checking":
        return renderChecking();
      default:
        return null;
    }
  };

  const showBack = step !== "identifier" && step !== "success" && step !== "checking";
  const onBack = () => {
    if (step === "login" || step === "register-password") goTo("identifier");
    else if (step === "register-details") goTo("register-password");
    else if (step === "register-otp") goTo("register-details");
  };

  return (
    <div className="h-[100dvh] w-full bg-white flex flex-col items-center font-['Roboto'] overflow-hidden py-3 px-4 select-none">
      <div className="w-full max-w-[360px] flex-1 flex flex-col relative min-h-0">
        {showBack && <BackButton onClick={onBack} />}

        {/* TOP SPACER - balances content vertically */}
        <div className="flex-1" />

        {/* TOP HEADER */}
        {step !== "checking" ? (
          <div className="w-full relative flex items-center justify-center pt-1 pb-3 shrink-0">
            <Logo />
          </div>
        ) : (
          <div className="h-8 shrink-0" />
        )}

        {/* MAIN BODY */}
        <div className="flex flex-col shrink-0">
          <NoticeBanner />
          <div key={step} className="flex flex-col" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
            {renderCurrentStepContent()}
          </div>
        </div>

        {/* SPACER - pushes footer to bottom like Jumia */}
        <div className="flex-1" />

        {/* SUPPORT FOOTER */}
        {step !== "checking" ? (
          <SupportFooter />
        ) : (
          <div className="h-8 shrink-0" />
        )}
      </div>
      <style>{`
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        iframe[src*="salesiq"], iframe[src*="zoho"], div[id*="zsiq"], div[class*="zsiq"], [id*="zoho"], [class*="zoho"], .zsiq_floatmain {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
