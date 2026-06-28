import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ChevronLeft, Lock, ChevronDown, X,
  Smartphone, CreditCard, Building2, Check, Upload, AlertCircle, Download, Info,
} from "lucide-react";
import { API_BASE, fetchSettings } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";

// ─── Default payment methods ─────────────────────────────────────────────────
const DEFAULT_METHODS = [
  { id: "mobile",   label: "Mobile",   sub: "MTN, Airtel, Zamtel", icon: "phone",     comingSoon: false },
  { id: "card",     label: "Card",     sub: "Visa, Mastercard",    icon: "card",      comingSoon: false },
  { id: "whatsapp", label: "WhatsApp", sub: "Pay on WhatsApp",     icon: "whatsapp",  comingSoon: false },
  { id: "bank",     label: "Bank",     sub: "Bank Transfer",       icon: "bank",      comingSoon: false },
];

const DIAL_CODES = ["+260", "+263", "+27", "+254", "+234", "+233", "+255", "+256", "+265", "+258", "+267", "+264", "+250", "+251", "+243", "+237", "+221", "+225", "+244", "+44", "+1", "+49", "+33", "+86", "+91", "+61", "+971"];

// Icon circle background per method type
const ICON_BG: Record<string, string> = {
  phone:    "rgba(39, 185, 175, 0.12)",
  card:     "rgba(59, 130, 246, 0.10)",
  whatsapp: "rgba(37, 211, 102, 0.12)",
  bank:     "rgba(100, 116, 139, 0.10)",
};

function MethodIconInner({ type }: { type: string }) {
  if (type === "phone") return <Smartphone className="w-6 h-6" style={{ color: "var(--kryros-primary)" }} />;
  if (type === "card")  return <CreditCard  className="w-6 h-6 text-blue-500" />;
  if (type === "bank")  return <Building2   className="w-6 h-6 text-slate-500" />;
  if (type === "whatsapp") return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
  return null;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs font-semibold border px-3 py-1 rounded-lg transition-colors text-[var(--kryros-primary)]"
      style={{ borderColor: "var(--kryros-primary)" }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface ReceiptData {
  recipientNumber: string; recipientName: string; operatorName: string;
  transactionId: string; dateTime: string; convenienceCharges: number;
  amount: number; currency: string; reference: string;
}

function ReceiptScreen({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>KRYROS Receipt - ${receipt.reference}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:40px 16px}.card{background:#fff;border-radius:16px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}.header{background:#fff;padding:32px 24px 20px;text-align:center;border-bottom:1px solid #f0f0f0}.icon-wrap{width:64px;height:64px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}.checkmark{color:#fff;font-size:28px;font-weight:700}.title{font-size:20px;font-weight:700;color:#111;margin-bottom:6px}.subtitle{font-size:13px;color:#555;line-height:1.5}.body{padding:20px 24px}.row{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 0;border-bottom:1px solid #f0f0f0}.row:last-child{border-bottom:none}.label{font-size:13px;color:#888;flex:1}.value{font-size:13px;font-weight:600;color:#111;text-align:right;flex:1}.value.red{color:#b91c1c}.footer{padding:16px 24px;text-align:center;background:#fafafa;border-top:1px solid #f0f0f0;font-size:11px;color:#aaa}.kryros{font-weight:700;color:#27B9AF}</style>
</head><body><div class="card"><div class="header"><div class="icon-wrap"><span class="checkmark">✓</span></div>
<div class="title">Transaction Successful</div>
<div class="subtitle"><strong>${receipt.currency} ${receipt.amount.toFixed(2)}</strong> sent to KRYROS MOBILE TECH LIMITED (${receipt.recipientNumber}).</div></div>
<div class="body">
<div class="row"><span class="label">Recipient Number</span><span class="value">${receipt.recipientNumber}</span></div>
<div class="row"><span class="label">Recipient Name</span><span class="value">${receipt.recipientName}</span></div>
<div class="row"><span class="label">Operator Name</span><span class="value">${receipt.operatorName}</span></div>
<div class="row"><span class="label">Transaction ID</span><span class="value">${receipt.transactionId}</span></div>
<div class="row"><span class="label">Date &amp; Time</span><span class="value">${receipt.dateTime}</span></div>
<div class="row"><span class="label">Fee</span><span class="value red">${receipt.currency} ${receipt.convenienceCharges.toFixed(2)}</span></div>
<div class="row"><span class="label">Amount</span><span class="value red">${receipt.currency} ${receipt.amount.toFixed(2)}</span></div>
</div><div class="footer">Powered by <span class="kryros">KRYROS</span> · Secure · Encrypted · Safe</div></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `KRYROS-Receipt-${receipt.reference}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-sm space-y-4">
        <div ref={receiptRef} className="bg-card rounded-3xl overflow-hidden shadow-xl border border-card-border">
          <div className="px-6 pt-8 pb-6 text-center border-b border-card-border">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1.5">Transaction Successful</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-red-500 font-bold">{receipt.currency} {receipt.amount.toFixed(2)}</span>
              {" "}has been successfully sent to<br />KRYROS MOBILE TECH LIMITED ({receipt.recipientNumber}).
            </p>
          </div>
          <div className="px-6 py-2">
            {[
              { label: "Recipient Number", value: receipt.recipientNumber, red: false },
              { label: "Recipient Name", value: receipt.recipientName, red: false },
              { label: "Operator Name", value: receipt.operatorName, red: false },
              { label: "Transaction ID", value: receipt.transactionId, red: false },
              { label: "Date & Time", value: receipt.dateTime, red: false },
              { label: "Fee", value: `${receipt.currency} ${receipt.convenienceCharges.toFixed(2)}`, red: true },
              { label: "Amount", value: `${receipt.currency} ${receipt.amount.toFixed(2)}`, red: true },
            ].map(({ label, value, red }) => (
              <div key={label} className="flex items-start justify-between py-3.5 border-b border-card-border last:border-0">
                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                <span className={`text-sm font-semibold text-right flex-1 ${red ? "text-red-500" : "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleDownload} className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all bg-[var(--kryros-primary)] hover:bg-[var(--kryros-primary-hover)]">
          <Download className="w-4 h-4" /> Download Receipt
        </button>
        <Link href="/">
          <button className="w-full py-3.5 border border-border bg-background text-foreground rounded-2xl font-semibold text-sm hover:bg-muted transition-colors">
            Back to Home
          </button>
        </Link>
        <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" /> Secure · Encrypted · Safe
        </p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PayPage() {
  const [, params] = useRoute("/pay/:linkId");
  const [, navigate] = useLocation();
  const paymentLinkId = params?.linkId;
  const [step, setStep] = useState<1 | 2>(1);
  const { selected: selectedCurrency, currencies: allCurrencies, format, setCurrency: setGlobalCurrency } = useCurrencyStore();

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlAmount = urlParams.get("amount") || "";
  const urlCurrency = urlParams.get("currency")?.toUpperCase();
  const urlNote = urlParams.get("note") || "";
  const queryLinkedPayment = !!urlAmount;
  const isLinkedPayment = !!paymentLinkId || queryLinkedPayment;
  const [linkLoading, setLinkLoading] = useState(!!paymentLinkId);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkedPaymentName, setLinkedPaymentName] = useState("");
  const [linkedExpiry, setLinkedExpiry] = useState<string | null>(null);

  useEffect(() => {
    if (urlCurrency && allCurrencies.some(c => c.code === urlCurrency)) setGlobalCurrency(urlCurrency);
  }, [urlCurrency, allCurrencies, setGlobalCurrency]);

  useEffect(() => {
    if (!paymentLinkId) {
      setLinkLoading(false);
      setLinkError(null);
      setLinkedPaymentName("");
      setLinkedExpiry(null);
      return;
    }

    let active = true;
    setLinkLoading(true);
    setLinkError(null);

    fetch(`${API_BASE}/api/pay-links/${paymentLinkId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Payment link not found");
        }
        return data;
      })
      .then((link: any) => {
        if (!active) return;

        if (!link?.isActive) {
          setLinkError("This payment link is no longer active.");
          return;
        }

        if (link?.expiresAt && new Date(link.expiresAt) < new Date()) {
          setLinkError("This payment link has expired.");
          return;
        }

        const currencyCode = String(link.currency || "ZMW").toUpperCase();
        const normalizedAmount = String(Number(link.amount || 0));

        setLinkedPaymentName(link.name || "Payment Link");
        setLinkedExpiry(link.expiresAt || null);
        setRawAmount(normalizedAmount);
        setNote(link.note || "");

        if (allCurrencies.some((item) => item.code === currencyCode)) {
          setGlobalCurrency(currencyCode);
        }
      })
      .catch((err) => {
        if (!active) return;
        setLinkError(err.message || "Unable to load this payment link.");
      })
      .finally(() => {
        if (active) setLinkLoading(false);
      });

    return () => {
      active = false;
    };
  }, [paymentLinkId, allCurrencies, setGlobalCurrency]);

  const [rawAmount, setRawAmount] = useState(urlAmount);
  const [showCurrencyDrop, setShowCurrencyDrop] = useState(false);
  const [note, setNote] = useState(urlNote);
  const [receiptContact, setReceiptContact] = useState("");
  const [openMethod, setOpenMethod] = useState<string | null>(null);

  const amount = parseFloat(rawAmount) || 0;
  const [feeRate, setFeeRate] = useState(0.03);
  const fee = Math.round(amount * feeRate * 100) / 100;
  const total = amount + fee;

  const currency = selectedCurrency.code;
  const setCurrency = setGlobalCurrency;
  const CURRENCIES = allCurrencies;

  const [mmProvider, setMmProvider] = useState("MTN");
  const [mmPhone, setMmPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);

  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    const envWa = (import.meta as any).env?.VITE_WHATSAPP_NUMBER;
    if (envWa && envWa.trim()) return envWa.replace(/[^0-9]/g, "");
    return "260969597029";
  });
  const [payRef, setPayRef] = useState(() => "PAY-" + Date.now().toString(36).toUpperCase().slice(-8));

  const [bankProviders, setBankProviders] = useState<{ name: string; config?: { accountName?: string; accountNumber?: string } }[]>([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>(["MTN", "Airtel", "Zamtel"]);
  const [apiMethodTypes, setApiMethodTypes] = useState<string[]>([]);

  // User Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+260");
  const [showDialDrop, setShowDialDrop] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-config/public`)
      .then(r => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : data?.data ?? [];
        const bankMethod = arr.find((m: any) => m.type === "bank");
        if (bankMethod?.providers) setBankProviders(bankMethod.providers.filter((p: any) => p.isEnabled));
        const mobileMethod = arr.find((m: any) => m.type === "mobile_wallet");
        if (mobileMethod?.providers?.length > 0) {
          const nets: string[] = mobileMethod.providers
            .filter((p: any) => p.isEnabled)
            .flatMap((p: any) => (p.networks || []).filter((n: any) => n.isEnabled).map((n: any) => n.name));
          if (nets.length > 0) { setMobileNetworks(nets); setMmProvider(nets[0]); }
        }
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type);
        setApiMethodTypes(enabledTypes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSettings().then((settings) => {
      const arr = Array.isArray(settings) ? settings : (settings as any)?.data || [];
      const rate = arr.find((s: any) => s.key === 'processing_fee_rate')?.value;
      if (rate) setFeeRate(Number(rate) / 100);
      const wa = arr.find((s: any) => s.key === 'whatsapp_number')?.value;
      if (wa && wa.trim()) setWhatsappNumber(wa.replace(/[^0-9]/g, ""));
    }).catch(() => {});
  }, []);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<"idle" | "initializing" | "waiting" | "success" | "failed">("idle");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback((orderId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(pollRef.current!);
        setPayStatus("failed");
        setPayError("Payment session timed out. Please check your phone.");
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/api/payments/status/${orderId}`);
        const d = await r.json();
        if (d.status?.toLowerCase() === "paid") {
          clearInterval(pollRef.current!);
          setReceipt(d.receipt);
          setPayStatus("success");
        } else if (d.status?.toLowerCase() === "failed") {
          clearInterval(pollRef.current!);
          setPayStatus("failed");
          setPayError(d.message || "Payment failed or was cancelled.");
        }
      } catch {}
    }, 5000);
  }, []);

  const handleMobilePay = async () => {
    if (payLoading || !mmPhone.trim()) return;
    if (!firstName || !lastName || !email || !phone) {
      setPayError("Please fill in contact details for notifications.");
      return;
    }
    setPayLoading(true);
    setPayError(null);
    setPayStatus("initializing");

    try {
      const res = await fetch(`${API_BASE}/api/payments/pay-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          currency,
          phone: `260${mmPhone.replace(/^0/, "")}`,
          provider: mmProvider,
          note,
          contact: email,
          userDetails: { firstName, lastName, email, phone: `${dialCode}${phone}` }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Payment failed");
      setPayStatus("waiting");
      if (data.orderId) startPolling(data.orderId);
    } catch (err: any) {
      setPayError(err.message);
      setPayStatus("failed");
    } finally {
      setPayLoading(false);
    }
  };

  const handleOtherPay = async () => {
    if (payLoading) return;
    if (!firstName || !lastName || !email || !phone) {
      setPayError("Please fill in contact details for notifications.");
      return;
    }
    setPayLoading(true);
    setPayError(null);

    if (openMethod === "whatsapp") {
      try {
        const res = await fetch(`${API_BASE}/api/payments/pay-now`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total, currency, method: "whatsapp", note, contact: email,
            userDetails: { firstName, lastName, email, phone: `${dialCode}${phone}` }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "WhatsApp init failed");
        const msg = encodeURIComponent(
          `*Payment Request*\nAmount: ${currency} ${total.toFixed(2)}\nRef: ${note || "None"}\nCustomer: ${firstName} ${lastName}\nPhone: ${dialCode}${phone}\nEmail: ${email}`
        );
        window.open(`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${msg}`, "_blank");
        if (data.trackingLink) navigate(data.trackingLink);
      } catch (err: any) {
        setPayError(err.message || "Failed to initiate WhatsApp payment");
      } finally {
        setPayLoading(false);
      }
    }
  };

  if (receipt) return <ReceiptScreen receipt={receipt} onClose={() => setReceipt(null)} />;
  if (linkLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (linkError) return <div className="min-h-screen flex items-center justify-center text-red-500">{linkError}</div>;

  const activeMethods = DEFAULT_METHODS.filter(m => apiMethodTypes.includes(m.id) || m.id === "whatsapp");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-0 pb-10">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <button onClick={() => (step === 2 ? setStep(1) : navigate("/"))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
          </button>
          <h1 className="text-base font-bold text-foreground">Payment</h1>
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--kryros-primary)" }}>
            <Lock className="w-3.5 h-3.5" /> Secure Payment
          </div>
        </div>

        {step === 1 && (
          <div className="px-4 py-4 space-y-4">
            <p className="text-sm font-bold text-foreground">Amount</p>
            <div className="relative">
              <div className="flex h-[52px] rounded-xl bg-card border border-border overflow-hidden shadow-sm">
                <div className="min-w-[96px] flex items-center justify-center border-r border-border font-bold text-kryros-primary text-base gap-2">
                  <select value={currency} onChange={(e) => setGlobalCurrency(e.target.value)} disabled={isLinkedPayment} className="border-0 bg-transparent font-bold text-kryros-primary text-base appearance-none outline-none cursor-pointer disabled:opacity-50">
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-kryros-primary" />
                </div>
                <div className="flex-1 flex items-center justify-end pr-3 font-extrabold text-2xl text-foreground">
                  <input value={rawAmount} onChange={(e) => !isLinkedPayment && setRawAmount(e.target.value.replace(/[^0-9.]/g, ""))} readOnly={isLinkedPayment} placeholder="0.00" inputMode="decimal" className="border-0 outline-none font-extrabold text-2xl text-right w-full bg-transparent py-2 text-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm font-bold text-foreground">Personal Information</p>
              <div className="grid grid-cols-2 gap-3">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" className="w-full h-[46px] rounded-xl border border-border px-3 bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" className="w-full h-[46px] rounded-xl border border-border px-3 bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full h-[46px] rounded-xl border border-border px-3 bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              <div className="flex gap-2">
                <div className="relative w-20 flex-shrink-0">
                  <input
                    value={dialCode}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val && !val.startsWith("+")) val = "+" + val.replace(/[^0-9]/g, "");
                      setDialCode(val);
                    }}
                    onFocus={() => setShowDialDrop(true)}
                    onBlur={() => setTimeout(() => setShowDialDrop(false), 200)}
                    placeholder="+260"
                    className="w-full h-[46px] rounded-xl border border-border px-2 bg-card text-sm font-bold outline-none text-center"
                  />
                  {showDialDrop && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-background border border-border rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                      {DIAL_CODES.map(code => (
                        <button key={code} onClick={() => { setDialCode(code); setShowDialDrop(false); }} className="w-full px-3 py-2.5 text-sm font-bold hover:bg-muted text-center border-b last:border-0">{code}</button>
                      ))}
                    </div>
                  )}
                </div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" className="flex-1 h-[46px] rounded-xl border border-border px-3 bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-2">
              <div className="flex justify-between text-sm font-semibold text-muted-foreground"><span>Amount</span><span>{currency} {amount.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm font-semibold text-muted-foreground"><span>Fee ({Math.round(feeRate*100)}%)</span><span>{currency} {fee.toFixed(2)}</span></div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-black text-foreground"><span>Total Payable</span><span className="text-lg text-primary">{currency} {total.toFixed(2)}</span></div>
            </div>
            <button onClick={() => amount > 0 && setStep(2)} disabled={amount <= 0} className="w-full h-[52px] rounded-xl bg-primary text-white font-extrabold text-base transition-all active:scale-95 disabled:opacity-50">Continue to Payment</button>
          </div>
        )}

        {step === 2 && (
          <div className="px-4 space-y-5 pb-6">
            <div className="text-center pt-3 pb-1">
              <p className="text-sm text-muted-foreground">You are sending</p>
              <p className="text-4xl font-black mt-1 tracking-tight text-primary">{currency} {total.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {activeMethods.map(m => (
                <button key={m.id} onClick={() => setOpenMethod(m.id)} className={`flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-2xl border bg-card transition-all active:scale-95 ${openMethod === m.id ? "border-primary shadow-[0_0_0_1px_var(--kryros-primary)]" : "border-border"}`}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ICON_BG[m.icon] }}><MethodIconInner type={m.icon} /></div>
                  <span className="text-xs font-semibold text-foreground">{m.label}</span>
                </button>
              ))}
            </div>
            {payError && <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {payError}</div>}
            {openMethod === "mobile" && (
              <div className="space-y-4">
                <div className="relative">
                  <button onClick={() => setShowProviderDrop(!showProviderDrop)} className="w-full flex justify-between items-center px-4 h-[52px] rounded-xl border bg-card transition-colors hover:bg-muted">{mmProvider}<ChevronDown className={`w-5 h-5 transition-transform ${showProviderDrop ? "rotate-180" : ""}`} /></button>
                  {showProviderDrop && (
                    <div className="absolute top-full w-full mt-1 border rounded-xl bg-card shadow-lg z-10">
                      {mobileNetworks.map(net => <button key={net} onClick={() => { setMmProvider(net); setShowProviderDrop(false); }} className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors text-sm border-b last:border-0">{net}</button>)}
                    </div>
                  )}
                </div>
                <div className="flex h-[52px] items-center rounded-xl border bg-card overflow-hidden">
                  <div className="px-4 h-full flex items-center border-r text-sm font-semibold text-primary">+260</div>
                  <input value={mmPhone} onChange={(e) => setMmPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Enter mobile money number" inputMode="tel" className="flex-1 h-full bg-transparent outline-none px-4 text-sm font-medium text-foreground" />
                </div>
                <button onClick={handleMobilePay} disabled={payLoading || !mmPhone.trim()} className="w-full h-[52px] rounded-xl bg-primary text-white font-bold transition-all active:scale-95 disabled:opacity-50">{payLoading ? "Processing..." : `Pay ${currency} ${total.toFixed(2)}`}</button>
              </div>
            )}
            {openMethod === "whatsapp" && <button onClick={handleOtherPay} className="w-full h-[52px] rounded-xl bg-[#25D366] text-white font-bold transition-all active:scale-95">Pay via WhatsApp</button>}
          </div>
        )}
      </div>
    </div>
  );
}
