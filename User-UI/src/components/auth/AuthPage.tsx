import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Check, ChevronRight } from "lucide-react";
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
  { code: "+260", label: "Zambia +260" },
  { code: "+234", label: "Nigeria +234" },
  { code: "+254", label: "Kenya +254" },
  { code: "+256", label: "Uganda +256" },
  { code: "+255", label: "Tanzania +255" },
  { code: "+27",  label: "South Africa +27" },
  { code: "+233", label: "Ghana +233" },
  { code: "+1",   label: "USA/Canada +1" },
  { code: "+44",  label: "UK +44" },
];

function normalizeIdentifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("@")) return trimmed.toLowerCase();
  const np = trimmed.replace(/[^\d+]/g, "");
  if (np.startsWith("+")) return "+" + np.slice(1).replace(/\D/g, "");
  return np.replace(/\D/g, "");
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
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+260");
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
  const isEmail = identifier.includes("@");
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
    setLocalLoading(true);
    try {
      const res = await register({ 
        identifier: normalizeIdentifier(identifier), 
        password, 
        firstName: firstName.trim(), 
        lastName: lastName.trim(),
        phone: phone.trim() ? `${countryCode}${phone.trim()}` : undefined
      });
      if (!res.success) { setLocalLoading(false); setNotice(res.error || "Registration failed."); return; }
      if (isEmail) {
        try { await fetch(`${EFFECTIVE_API_BASE}/api/auth/send-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizeIdentifier(identifier) }) }); }
        catch { goTo("success"); setLocalLoading(false); return; }
      }
      goTo("register-otp");
    } catch { setNotice("Network error."); }
    finally { setLocalLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) { setNotice("Please enter the complete 6-digit code."); return; }
    setNotice(""); setLocalLoading(true);
    try {
      const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizeIdentifier(identifier), code }) });
      if (res.ok) goTo("success");
      else { const data = await res.json().catch(() => ({})); setNotice(data.message || "Invalid code."); }
    } catch { goTo("success"); }
    finally { setLocalLoading(false); }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setNotice(""); setLocalLoading(true);
    try {
      await fetch(`${EFFECTIVE_API_BASE}/api/auth/send-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizeIdentifier(identifier) }) });
      setCountdown(OTP_COUNTDOWN); setNotice("A new code has been sent.");
    } catch { setNotice("Failed to resend code."); }
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

  const strengthColor = () => passwordEval.score <= 2 ? "#D63031" : passwordEval.score === 3 ? "#F68B1E" : "#2DBE60";
  const strengthWidth = () => password.length === 0 ? "0%" : `${(passwordEval.score / 5) * 100}%`;

  const ic = "w-full h-[48px] border border-[#E5E5E5] rounded-[10px] bg-[#FAFAFA] text-[#313133] text-[14px] px-[14px] outline-none placeholder:text-[#9E9E9E] font-['Roboto'] focus:border-[#C0151B] focus:bg-white focus:ring-1 focus:ring-[#C0151B]/20 transition-all duration-200";
  const bp = "w-full h-[48px] border-none rounded-[10px] bg-[#C0151B] text-white text-[14px] font-bold font-['Roboto'] cursor-pointer tracking-[0.02em] transition-all duration-200 hover:bg-[#A01015] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const bs = "w-full h-[48px] border border-[#E5E5E5] rounded-[10px] bg-white text-[#313133] text-[14px] font-medium font-['Roboto'] cursor-pointer transition-all duration-200 hover:border-[#C0151B] hover:text-[#C0151B] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const bn = "w-full h-[48px] border-none rounded-[10px] bg-[#344a64] text-white text-[14px] font-bold font-['Roboto'] cursor-pointer tracking-[0.02em] transition-all duration-200 hover:bg-[#2a3d52] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";
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
        <span className="text-[#313133]">KRY</span><span className="text-[#C0151B]">ROS</span>
      </h1>
    </div>
  );
  const NoticeBanner = () => {
    const msg = notice || error; if (!msg) return null;
    const isErr = !!error;
    return <div className={`mb-4 px-4 py-3 rounded-[8px] text-[13px] leading-snug font-['Roboto'] ${isErr ? "bg-[#FFF0F0] text-[#D63031] border border-[#FFD0D0]" : "bg-[#F0F7FF] text-[#344a64] border border-[#D0E0F0]"}`}>{msg}</div>;
  };
  const ShownEmail = ({ onEdit }: { onEdit: () => void }) => (
    <div className="bg-[#F0F0F0] rounded-[10px] px-4 py-3 mb-5 flex items-center justify-between font-['Roboto']">
      <span className="text-[14px] text-[#313133] truncate flex-1">{identifier}</span>
      <button type="button" onClick={onEdit} className="text-[#C0151B] text-[12px] font-medium bg-transparent border-none cursor-pointer hover:underline ml-2 shrink-0 font-['Roboto']">Edit</button>
    </div>
  );
  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} className="absolute top-5 left-5 bg-transparent border-none cursor-pointer text-[#75757A] hover:text-[#313133] transition-colors p-1 flex items-center gap-1">
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const renderIdentifierStep = () => (
    <div className="flex flex-col">
      <Logo />
      <p className="text-center text-[13px] text-[#75757A] mb-6 font-['Roboto']">
        {checkFallback ? "Sign in or create a new account" : "Enter your email or phone to continue"}
      </p>
      {!checkFallback ? (
        <>
          <div className="mb-4">
            <label className={lc}>Email Address or Phone Number</label>
            <input type="text" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setCheckFallback(false); }} placeholder="Enter your email or phone number" className={ic} autoFocus autoComplete="email" />
          </div>
          <button type="button" onClick={handleCheckIdentifier} disabled={active || !identifier.trim()} className={bp}>
            {active ? <Spinner /> : "Continue"}{!active && <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E5E5E5]" /><span className="text-[11px] text-[#9E9E9E] uppercase tracking-[0.05em] font-['Roboto']">or continue with</span><div className="flex-1 h-px bg-[#E5E5E5]" />
          </div>
          <button type="button" className={bs} disabled={active}><GoogleIcon />Continue with Google</button>
        </>
      ) : (
        <>
          <div className="mb-4">
            <label className={lc}>Email Address or Phone Number</label>
            <input type="text" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setCheckFallback(false); }} placeholder="Enter your email or phone number" className={ic} autoFocus autoComplete="email" />
          </div>
          <p className="text-center text-[12px] text-[#75757A] mb-4 font-['Roboto']">Is this a new or existing account?</p>
          <button type="button" onClick={() => goTo("login")} disabled={!identifier.trim()} className={bn}><Lock className="w-4 h-4" />Sign In</button>
          <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-[#E5E5E5]" /><span className="text-[11px] text-[#9E9E9E] font-['Roboto']">or</span><div className="flex-1 h-px bg-[#E5E5E5]" /></div>
          <button type="button" onClick={() => goTo("register-password")} disabled={!identifier.trim()} className={bp}><User className="w-4 h-4" />Create Account</button>
          <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-[#E5E5E5]" /><span className="text-[11px] text-[#9E9E9E] uppercase tracking-[0.05em] font-['Roboto']">or</span><div className="flex-1 h-px bg-[#E5E5E5]" /></div>
          <button type="button" className={bs} disabled={active}><GoogleIcon />Continue with Google</button>
        </>
      )}
    </div>
  );

  const renderLoginStep = () => (
    <form onSubmit={handleLogin} className="flex flex-col">
      <BackButton onClick={() => goTo("identifier")} />
      <Logo />
      <p className="text-center text-[13px] text-[#75757A] mb-5 font-['Roboto']">Welcome back! Enter your password to sign in.</p>
      <ShownEmail onEdit={() => goTo("identifier")} />
      <div className="mb-4">
        <label className={lc}>Password</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={ic} style={{ paddingRight: "44px" }} autoFocus autoComplete="current-password" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#75757A] hover:text-[#313133] p-0 flex">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <button type="button" onClick={() => setLocation("/forgot-password")} className="self-end text-[12px] text-[#C0151B] font-medium hover:underline mb-4 bg-transparent border-none cursor-pointer font-['Roboto']">Forgot password?</button>
      <button type="submit" disabled={active} className={bn}>{active ? <Spinner /> : "Sign In"}</button>
    </form>
  );

  const renderRegisterPasswordStep = () => (
    <div className="flex flex-col">
      <BackButton onClick={() => goTo("identifier")} />
      <Logo />
      <p className="text-center text-[13px] text-[#75757A] mb-5 font-['Roboto']">Create your KRYROS account</p>
      <ShownEmail onEdit={() => goTo("identifier")} />
      <div className="mb-4">
        <label className={lc}>Create Password</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" className={ic} style={{ paddingRight: "44px" }} autoFocus autoComplete="new-password" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#75757A] hover:text-[#313133] p-0 flex">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="mt-2">
            <div className="h-[4px] bg-[#E5E5E5] rounded-[2px] overflow-hidden">
              <div className="h-full rounded-[2px] transition-all duration-300" style={{ width: strengthWidth(), backgroundColor: strengthColor() }} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(passwordEval.checks).map(([key, passed]) => (
                <span key={key} className={`text-[10px] px-2 py-0.5 rounded-[4px] font-['Roboto'] ${passed ? "bg-[#E8F5E9] text-[#2DBE60]" : "bg-[#F5F5F5] text-[#9E9E9E]"}`}>
                  {key === "length" ? "8+ chars" : key === "uppercase" ? "A-Z" : key === "lowercase" ? "a-z" : key === "number" ? "0-9" : "!#$%"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mb-5">
        <label className={lc}>Confirm Password</label>
        <div className="relative">
          <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className={ic} style={{ paddingRight: "44px" }} autoComplete="new-password" />
          <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#75757A] hover:text-[#313133] p-0 flex">
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {confirmPassword && password !== confirmPassword && <p className="text-[11px] text-[#D63031] mt-1 font-['Roboto']">Passwords do not match</p>}
      </div>
      <button type="button" onClick={handlePasswordContinue} disabled={active || !password || password !== confirmPassword} className={bp}>Continue <ChevronRight className="w-4 h-4" /></button>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="flex flex-col">
      <BackButton onClick={() => goTo("register-password")} />
      <Logo />
      <p className="text-center text-[13px] text-[#75757A] mb-5 font-['Roboto']">Tell us about yourself</p>
      <div className="mb-4"><label className={lc}>First Name</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter your first name" className={ic} autoFocus autoComplete="given-name" /></div>
      <div className="mb-4"><label className={lc}>Last Name</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter your last name" className={ic} autoComplete="family-name" /></div>
      <div className="mb-5">
        <label className={lc}>Phone Number (Optional)</label>
        <div className="flex gap-2 h-[48px]">
          <div className="relative w-[100px] shrink-0">
            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={`${ic} w-full pr-8 appearance-none cursor-pointer text-center px-2`}>
              {COUNTRY_CODES.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#75757A]">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="Phone number" className={`${ic} flex-1`} autoComplete="tel" />
        </div>
      </div>
      <button type="button" onClick={handleRegisterAndSendOTP} disabled={active || !firstName.trim() || !lastName.trim()} className={bn}>{active ? <Spinner /> : "Continue"}{!active && <ChevronRight className="w-4 h-4" />}</button>
    </div>
  );

  const renderOTPStep = () => (
    <div className="flex flex-col">
      <BackButton onClick={() => goTo("register-details")} />
      <Logo />
      <p className="text-center text-[13px] text-[#75757A] mb-1 font-['Roboto']">We sent a verification code to</p>
      <p className="text-center text-[14px] font-bold text-[#313133] mb-6 font-['Roboto']">{identifier}</p>
      <div className="flex gap-2 justify-center mb-5" onPaste={handleOTPPaste}>
        {otp.map((digit, i) => (
          <input key={i} ref={(el) => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
            onChange={(e) => handleOTPChange(i, e.target.value)} onKeyDown={(e) => handleOTPKeyDown(i, e)}
            className="w-[46px] h-[54px] border border-[#E5E5E5] rounded-[10px] text-center text-[22px] font-bold text-[#313133] bg-[#FAFAFA] font-['Roboto'] outline-none focus:border-[#C0151B] focus:bg-white focus:ring-1 focus:ring-[#C0151B]/20 transition-all duration-200"
            autoFocus={i === 0} />
        ))}
      </div>
      <div className="text-center mb-5">
        {countdown > 0 ? (
          <span className="text-[12px] text-[#75757A] font-['Roboto']">Resend code in <strong className="text-[#313133]">{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}</strong></span>
        ) : (
          <button type="button" onClick={handleResendOTP} disabled={active} className="text-[12px] text-[#C0151B] font-medium hover:underline bg-transparent border-none cursor-pointer font-['Roboto']">Resend code</button>
        )}
      </div>
      <button type="button" onClick={handleVerifyOTP} disabled={active || otp.some((d) => !d)} className={bp}>{active ? <Spinner /> : "Verify & Continue"}</button>
    </div>
  );

  // Success redirect effect at component level (not inside render function)
  const successRedirected = useRef(false);
  useEffect(() => {
    if (step === "success" && !successRedirected.current) {
      successRedirected.current = true;
      const t = setTimeout(() => setLocation("/dashboard"), 3000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center text-center">
      <Logo />
      <div className="w-[72px] h-[72px] bg-[#2DBE60] rounded-full flex items-center justify-center mb-5 mt-2"><Check className="w-9 h-9 text-white" strokeWidth={3} /></div>
      <h2 className="text-[18px] font-bold text-[#313133] mb-1 font-['Roboto']">{firstName ? `${firstName}, your account has been created!` : "Account created successfully!"}</h2>
      <p className="text-[13px] text-[#75757A] mb-6 font-['Roboto']">Redirecting you to your dashboard...</p>
      <button type="button" onClick={() => setLocation("/dashboard")} className={bp}>Continue Shopping</button>
    </div>
  );

  const renderChecking = () => (
    <div className="flex flex-col items-center justify-center py-8"><Logo /><Spinner /><p className="text-[14px] text-[#75757A] mt-4 font-['Roboto']">Checking your account...</p></div>
  );

  return (
    <div className="fixed inset-0 bg-[#F5F5F5] flex items-center justify-center p-4" style={{ overflow: "hidden" }}>
      <div className="w-full max-w-[400px] bg-white rounded-[20px] shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-[#E5E5E5] p-6 pb-7 relative overflow-hidden">
        <div key={step} style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
          {step === "checking" && renderChecking}
          {step === "identifier" && <><NoticeBanner />{renderIdentifierStep()}</>}
          {step === "login" && <><NoticeBanner />{renderLoginStep()}</>}
          {step === "register-password" && <><NoticeBanner />{renderRegisterPasswordStep()}</>}
          {step === "register-details" && <><NoticeBanner />{renderDetailsStep()}</>}
          {step === "register-otp" && <><NoticeBanner />{renderOTPStep()}</>}
          {step === "success" && renderSuccessStep()}
        </div>
      </div>
      <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
