import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft, Lock, ChevronDown, X,
  Smartphone, CreditCard, Building2, Check, Upload, AlertCircle, Download, Info,
} from "lucide-react";
import { API_BASE, fetchSettings } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";

// ─── Brand color ────────────────────────────────────────────────────────────
const TEAL = "#27B9AF";
const TEAL_DARK = "#1a9e95";

// ─── Default payment methods ─────────────────────────────────────────────────
const DEFAULT_METHODS = [
  { id: "mobile",   label: "Mobile",   sub: "MTN, Airtel, Zamtel", icon: "phone",     comingSoon: false },
  { id: "card",     label: "Card",     sub: "Visa, Mastercard",    icon: "card",      comingSoon: false },
  { id: "whatsapp", label: "WhatsApp", sub: "Pay on WhatsApp",     icon: "whatsapp",  comingSoon: false },
  { id: "bank",     label: "Bank",     sub: "Bank Transfer",       icon: "bank",      comingSoon: false },
];

function MethodIcon({ type }: { type: string }) {
  if (type === "phone") return <Smartphone className="w-5 h-5" style={{ color: TEAL }} />;
  if (type === "card") return <CreditCard className="w-5 h-5 text-blue-500" />;
  if (type === "bank") return <Building2 className="w-5 h-5 text-slate-500" />;
  if (type === "whatsapp") return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366">
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
      className="text-xs font-semibold border px-3 py-1 rounded-lg transition-colors"
      style={{ color: TEAL, borderColor: TEAL + "66" }}
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
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:40px 16px}.card{background:#fff;border-radius:16px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}.header{background:#fff;padding:32px 24px 20px;text-align:center;border-bottom:1px solid #f0f0f0}.icon-wrap{width:64px;height:64px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}.checkmark{color:#fff;font-size:28px;font-weight:700}.title{font-size:20px;font-weight:700;color:#111;margin-bottom:6px}.subtitle{font-size:13px;color:#555;line-height:1.5}.body{padding:20px 24px}.row{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 0;border-bottom:1px solid #f0f0f0}.row:last-child{border-bottom:none}.label{font-size:13px;color:#888;flex:1}.value{font-size:13px;font-weight:600;color:#111;text-align:right;flex:1}.value.red{color:#b91c1c}.footer{padding:16px 24px;text-align:center;background:#fafafa;border-top:1px solid #f0f0f0;font-size:11px;color:#aaa}.kryros{font-weight:700;color:${TEAL}}</style>
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#f0f4f8" }}>
      <div className="w-full max-w-sm space-y-4">
        <div ref={receiptRef} className="bg-white rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1.5">Transaction Successful</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
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
              <div key={label} className="flex items-start justify-between py-3.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500 flex-1">{label}</span>
                <span className={`text-sm font-semibold text-right flex-1 ${red ? "text-red-500" : "text-gray-900"}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleDownload} className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}>
          <Download className="w-4 h-4" /> Download Receipt
        </button>
        <Link href="/">
          <button className="w-full py-3.5 border border-gray-200 bg-white text-gray-700 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            Back to Home
          </button>
        </Link>
        <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" /> Secure · Encrypted · Safe
        </p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PayPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const { selected: selectedCurrency, currencies: allCurrencies, format, setCurrency: setGlobalCurrency } = useCurrencyStore();

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlAmount = urlParams.get("amount") || "";
  const urlCurrency = urlParams.get("currency")?.toUpperCase();
  const urlNote = urlParams.get("note") || "";
  const isLinkedPayment = !!urlAmount;

  useEffect(() => {
    if (urlCurrency && allCurrencies.some(c => c.code === urlCurrency)) setGlobalCurrency(urlCurrency);
  }, [urlCurrency, allCurrencies, setGlobalCurrency]);

  const [rawAmount, setRawAmount] = useState(urlAmount);
  const [showCurrencyDrop, setShowCurrencyDrop] = useState(false);
  const [note, setNote] = useState(urlNote);
  const [receiptContact, setReceiptContact] = useState("");
  const [openMethod, setOpenMethod] = useState<string | null>(null);

  const amount = parseFloat(rawAmount) || 0;
  const [feeRate, setFeeRate] = useState(0.01);
  const fee = Math.round(amount * feeRate * 100) / 100;
  const total = amount + fee;

  const currency = selectedCurrency.code;
  const setCurrency = setGlobalCurrency;
  const CURRENCIES = allCurrencies;

  const [mmProvider, setMmProvider] = useState("MTN");
  const [mmPhone, setMmPhone] = useState("");
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);

  const whatsappNumber = (import.meta as any).env?.VITE_WHATSAPP_NUMBER || "260969597029";
  const [payRef, setPayRef] = useState(() => "PAY-" + Date.now().toString(36).toUpperCase().slice(-8));

  const [bankProviders, setBankProviders] = useState<{ name: string; config?: { accountName?: string; accountNumber?: string } }[]>([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>(["MTN", "Airtel", "Zamtel"]);
  const [apiMethodTypes, setApiMethodTypes] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-config/public`)
      .then(r => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        const bankMethod = arr.find((m: any) => m.type === "bank");
        if (bankMethod?.providers) setBankProviders(bankMethod.providers.filter((p: any) => p.isEnabled));
        const mobileMethod = arr.find((m: any) => m.type === "mobile_wallet");
        if (mobileMethod?.providers?.length > 0) {
          const nets: string[] = mobileMethod.providers
            .filter((p: any) => p.isEnabled)
            .flatMap((p: any) => (p.networks || []).filter((n: any) => n.isEnabled).map((n: any) => n.name));
          if (nets.length > 0) { setMobileNetworks(nets); setMmProvider(nets[0]); }
        }
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type as string);
        setApiMethodTypes(enabledTypes);
      })
      .catch(() => {});

    fetchSettings()
      .then((settings) => {
        const rate = settings.find((s: any) => s.key === "processing_fee_rate")?.value;
        if (rate) setFeeRate(Number(rate) / 100);
      })
      .catch(() => {});
  }, []);

  const TYPE_TO_ID: Record<string, string> = {
    mobile_wallet: "mobile", card: "card", bank: "bank",
    cash: "cod", digital_wallet: "whatsapp", whatsapp: "whatsapp",
  };
  const activeMethods = apiMethodTypes.length > 0
    ? (apiMethodTypes.map((t) => DEFAULT_METHODS.find((m) => m.id === (TYPE_TO_ID[t] ?? t))).filter(Boolean) as typeof DEFAULT_METHODS)
    : [...DEFAULT_METHODS];

  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payStatus, setPayStatus] = useState<"idle" | "sending" | "waiting" | "paid" | "failed">("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptPhone, setReceiptPhone] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = useAuthStore((s) => s.token);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const buildReceipt = useCallback((data: { orderId?: string; reference?: string }) => {
    const providerName = mmProvider.replace(" Mobile Money", "").replace(" Money", "");
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
      ", " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return {
      recipientNumber: "966629719", recipientName: "KRYROS MOBILE TECH LIMITED",
      operatorName: providerName, transactionId: data.reference || data.orderId || payRef,
      dateTime: dateStr, convenienceCharges: fee, amount: total, currency, reference: payRef,
    } as ReceiptData;
  }, [mmProvider, fee, total, currency, payRef]);

  const sendReceiptNotification = useCallback((receiptData: ReceiptData) => {
    const phone = receiptPhone.trim(); const email = receiptEmail.trim();
    if (!phone && !email) return;
    fetch(`${API_BASE}/api/notifications/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone || undefined, email: email || undefined, orderRef: receiptData.reference, amount: receiptData.amount.toFixed(2), currency: receiptData.currency, customerName: "Customer", paymentMethod: receiptData.operatorName || "Direct Payment", status: "completed" }),
    }).catch(() => {});
  }, [receiptPhone, receiptEmail]);

  const startPolling = useCallback((oid: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/api/payments/status/${oid}`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        const status = data?.status as string | undefined;
        if (status === "PAID") {
          stopPolling();
          const r = buildReceipt({ orderId: oid, reference: data?.reference || data?.paymentReference });
          setPayStatus("paid"); setReceipt(r); sendReceiptNotification(r);
        } else if (status === "FAILED") {
          stopPolling(); setPayStatus("failed"); setPayError("Payment was declined or cancelled."); setPayLoading(false);
        }
      } catch { /* keep polling */ }
    }, 5000);
  }, [token, stopPolling, buildReceipt, sendReceiptNotification]);

  const handleMobileMoneyPay = async () => {
    if (!mmPhone || mmPhone.trim().length < 9) { setPayError("Please enter a valid mobile money number."); return; }
    if (amount <= 0) { setPayError("Please enter a valid amount."); return; }
    setPayError(null); setPayLoading(true); setPayStatus("sending");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/payments/direct`, {
        method: "POST", headers,
        body: JSON.stringify({ phone: mmPhone.trim(), amount: Math.round(total * 100) / 100, currency, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || "Payment could not be started. Please try again.";
        setPayError(Array.isArray(msg) ? msg.join(", ") : msg);
        setPayLoading(false); setPayStatus("idle"); return;
      }
      const newOrderId = data.orderId as string;
      const newRef = data.reference || data.orderNumber || payRef;
      setOrderId(newOrderId); setPayRef(newRef); setPayStatus("waiting"); setPayLoading(false);
      startPolling(newOrderId);
    } catch {
      setPayError("Network error. Please check your connection and try again.");
      setPayLoading(false); setPayStatus("idle");
    }
  };

  const handleWhatsAppPay = () => {
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 7) { alert("WhatsApp number is not configured. Please contact KRYROS support."); return; }
    const msg = `Hi KRYROS! 💳 *Direct Payment Request*\n\n*Reference:* ${payRef}\n*Amount:* ${currency} ${total.toFixed(2)}\n${note ? `*Note:* ${note}\n` : ""}\nPlease confirm this payment. Thank you!`;
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, "_blank");
    setPayStatus("waiting");
  };

  const isPaid = payStatus === "paid";
  const isFailed = payStatus === "failed";
  const isWaiting = payStatus === "waiting" && !isPaid && !isFailed;

  if (isPaid && receipt) return <ReceiptScreen receipt={receipt} onClose={() => { setPayStatus("idle"); setReceipt(null); }} />;

  // Waiting / failed screen
  if (isWaiting || isFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#f0f4f8" }}>
        <div className="w-full max-w-sm">
          <div className="rounded-3xl overflow-hidden" style={{ background: isFailed ? "linear-gradient(160deg,#3a0000 0%,#7a1a1a 100%)" : "linear-gradient(160deg,#07392f 0%,#0a5544 100%)" }}>
            <div className="p-8 text-center">
              {isFailed ? (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-400/20 border-4 border-red-400">
                  <X className="w-8 h-8 text-red-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4" style={{ borderColor: TEAL, background: TEAL + "33" }}>
                  <span className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: TEAL + "66", borderTopColor: TEAL }} />
                </div>
              )}
              <h2 className="text-xl font-black text-white mb-1">{isFailed ? "Payment Failed" : "Waiting for Approval"}</h2>
              <p className="text-white/60 text-sm mb-6">{isFailed ? (payError || "The payment was not completed. Please try again.") : `A payment prompt has been sent to ${mmPhone || "your phone"}. Please open your ${mmProvider} app and approve to complete payment.`}</p>
              <div className="rounded-2xl p-4 text-left space-y-2.5 mb-6" style={{ background: "rgba(255,255,255,0.1)" }}>
                {[["Reference", payRef], ["Amount", `${currency} ${total.toFixed(2)}`], ["Phone", mmPhone || "—"], ["Status", isFailed ? "❌ Failed" : "⏳ Awaiting Approval"]].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">{label}</span>
                    <span className="text-white text-xs font-bold">{val}</span>
                  </div>
                ))}
              </div>
              {isFailed ? (
                <button onClick={() => { setPayStatus("idle"); setPayError(null); setOrderId(null); setOpenMethod("mobile"); }} className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-400 transition-colors">Try Again</button>
              ) : (
                <p className="text-white/40 text-xs">Checking status automatically every 5 seconds…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="max-w-md mx-auto px-0 pb-24">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-base font-black text-gray-900">Payment</h1>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: TEAL }}>
            <Lock className="w-3 h-3" /> Secure Payment
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Amount entry (matches Image 1)
        ════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="px-4 space-y-4">

            {/* Amount label */}
            <p className="text-sm font-bold text-gray-900">Amount</p>

            {/* Currency + Amount row */}
            <div className="flex rounded-2xl overflow-hidden border bg-white" style={{ borderColor: "#e5e7eb" }}>
              {/* Currency selector */}
              <button
                onClick={() => setShowCurrencyDrop(!showCurrencyDrop)}
                className="flex items-center gap-1.5 px-4 py-4 border-r font-bold text-sm text-gray-900 hover:bg-gray-50 transition-colors flex-shrink-0"
                style={{ borderColor: "#e5e7eb" }}
              >
                {currency}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCurrencyDrop ? "rotate-180" : ""}`} />
              </button>
              {/* Amount input */}
              <input
                value={rawAmount}
                onChange={(e) => { if (!isLinkedPayment) setRawAmount(e.target.value.replace(/[^0-9.]/g, "")); }}
                readOnly={isLinkedPayment}
                placeholder="0.00"
                inputMode="decimal"
                className="flex-1 px-4 py-4 text-2xl font-black text-gray-900 outline-none bg-transparent text-right"
                style={{ color: "#1a2340" }}
              />
            </div>

            {/* Currency dropdown */}
            {showCurrencyDrop && (
              <div className="border rounded-2xl bg-white shadow-lg overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                {CURRENCIES.map((c) => (
                  <button key={c.code} onClick={() => { setCurrency(c.code); setShowCurrencyDrop(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm border-b last:border-0"
                    style={{ borderColor: "#f3f4f6", color: currency === c.code ? TEAL : "#1a2340", fontWeight: currency === c.code ? 700 : 500 }}>
                    <span>{c.code}</span>
                    {currency === c.code && <span className="ml-auto text-xs" style={{ color: TEAL }}>✓</span>}
                  </button>
                ))}
              </div>
            )}

            {isLinkedPayment && (
              <div className="rounded-xl px-4 py-3 text-sm border" style={{ background: "#ecfdf5", borderColor: "#6ee7b7", color: "#065f46" }}>
                <span className="font-bold">Payment Link</span> — Amount pre-filled: <strong>{currency} {rawAmount}</strong>
                {urlNote ? <span className="text-gray-500 ml-1">· {urlNote}</span> : null}
              </div>
            )}

            {/* Reference (Optional) */}
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-900">
                Reference <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5 bg-white" style={{ borderColor: "#e5e7eb" }}>
                {/* Tag icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter reference"
                  className="flex-1 text-sm outline-none bg-transparent text-gray-900"
                />
              </div>
            </div>

            {/* Phone or Email (Optional) */}
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-900">
                Phone or Email <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <div className="flex items-center gap-3 border rounded-2xl px-4 py-3.5 bg-white" style={{ borderColor: "#e5e7eb" }}>
                {/* Person icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke={TEAL} strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  value={receiptContact}
                  onChange={(e) => {
                    setReceiptContact(e.target.value);
                    if (e.target.value.includes("@")) {
                      setReceiptEmail(e.target.value); setReceiptPhone("");
                    } else {
                      setReceiptPhone(e.target.value); setReceiptEmail("");
                    }
                  }}
                  placeholder="Enter phone number or email"
                  className="flex-1 text-sm outline-none bg-transparent text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 px-1">We'll send your receipt after payment.</p>
            </div>

            {/* Payment Summary card */}
            <div className="border rounded-2xl bg-white px-5 py-4 space-y-3" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">{currency}{amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500 flex items-center gap-1">
                  Fee <Info className="w-3.5 h-3.5 text-gray-400" />
                </span>
                <span className="font-semibold text-gray-900">{currency}{fee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3" style={{ borderColor: "#f3f4f6" }}>
                <div className="flex justify-between">
                  <span className="text-sm font-black text-gray-900">Total Payable</span>
                  <span className="text-sm font-black" style={{ color: TEAL }}>{currency}{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Pay Now button */}
            <button
              onClick={() => amount > 0 && setStep(2)}
              disabled={amount <= 0}
              className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: amount > 0 ? `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` : "#d1d5db" }}
            >
              <Lock className="w-4 h-4" /> Pay Now
            </button>

            {/* 100% Secure footer */}
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                {/* Shield check icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={TEAL} strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                </svg>
                100% Secure Payment
              </div>
              <p className="text-[11px] text-gray-400">
                Your payment is safe with <span className="font-bold" style={{ color: TEAL }}>KRYROS</span>.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Choose payment method (matches Image 3)
        ════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="px-4 space-y-5">

            {/* "You are sending" header */}
            <div className="text-center pt-2 pb-1">
              <p className="text-sm text-gray-400">You are sending</p>
              <p className="text-4xl font-black mt-1" style={{ color: TEAL }}>{currency} {total.toFixed(2)}</p>
            </div>

            <div className="border-t" style={{ borderColor: "#e5e7eb" }} />

            {/* Choose Payment Method */}
            <div>
              <p className="text-base font-black text-gray-900 text-center mb-4">Choose Payment Method</p>
              <div className="grid grid-cols-3 gap-3">
                {activeMethods.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setOpenMethod(m.id)}
                    className="flex flex-col items-center gap-2 py-5 rounded-2xl border bg-white transition-all active:scale-95 hover:border-teal-300"
                    style={{ borderColor: openMethod === m.id ? TEAL : "#e5e7eb" }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#e6f7f6" }}>
                      <MethodIcon type={m.icon} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                  </button>
                ))}
              </div>
              {/* Additional methods as list if more than 3 */}
              {activeMethods.length > 3 && (
                <div className="mt-3 space-y-2">
                  {activeMethods.slice(3).map((m) => (
                    <button key={m.id} onClick={() => setOpenMethod(m.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border bg-white hover:border-teal-300 transition-all active:scale-[0.99]"
                      style={{ borderColor: "#e5e7eb" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#e6f7f6" }}>
                        <MethodIcon type={m.icon} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-gray-900">{m.label}</p>
                        <p className="text-[11px] text-gray-400">{m.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected method panel — renders inline on the page (no overlay/sheet), matching Image 1 */}
            {openMethod && (
              <div className="space-y-4">
                <div className="border-t" style={{ borderColor: "#e5e7eb" }} />

                {/* Panel header (icon + label + close) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#e6f7f6" }}>
                      <MethodIcon type={activeMethods.find((x) => x.id === openMethod)?.icon || "card"} />
                    </div>
                    <span className="text-base font-black text-gray-900">
                      {activeMethods.find((x) => x.id === openMethod)?.label}
                    </span>
                  </div>
                  <button onClick={() => setOpenMethod(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <X className="w-4 h-4 text-gray-700" />
                  </button>
                </div>

                {/* MOBILE — Network + Phone (dynamic: mobileNetworks comes from API config) */}
                {openMethod === "mobile" && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-900">Network</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowProviderDrop((v) => !v)}
                          className="w-full flex items-center justify-between border rounded-2xl px-4 py-3.5 bg-white text-sm font-semibold text-gray-900 hover:border-teal-300 transition-colors"
                          style={{ borderColor: "#e5e7eb" }}
                        >
                          {mmProvider}
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProviderDrop ? "rotate-180" : ""}`} />
                        </button>
                        {showProviderDrop && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                            {mobileNetworks.map((name) => (
                              <button key={name} type="button"
                                onClick={() => { setMmProvider(name); setShowProviderDrop(false); }}
                                className="w-full flex items-center px-4 py-3.5 text-left hover:bg-gray-50 transition-colors border-b last:border-0 text-sm font-semibold"
                                style={{ borderColor: "#f3f4f6", color: mmProvider === name ? TEAL : "#1a2340" }}>
                                {name}
                                {mmProvider === name && (
                                  <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: TEAL }}>
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-900">Phone Number</label>
                      <div className="flex items-center border rounded-2xl bg-white overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                        <span className="px-4 py-3.5 font-bold text-sm border-r" style={{ color: TEAL, borderColor: "#e5e7eb" }}>+260</span>
                        <input
                          value={mmPhone}
                          onChange={(e) => setMmPhone(e.target.value)}
                          placeholder=""
                          type="tel"
                          className="flex-1 px-3 py-3.5 text-sm text-gray-900 outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    {payError && (
                      <div className="flex items-start gap-2 rounded-2xl px-4 py-3 border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{payError}</p>
                      </div>
                    )}

                    <button
                      onClick={handleMobileMoneyPay}
                      disabled={payLoading}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
                    >
                      {payLoading ? (
                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{payStatus === "sending" ? "Sending…" : "Processing…"}</>
                      ) : (
                        <><Lock className="w-4 h-4" /> Pay Now <ChevronDown className="w-4 h-4 ml-auto" /></>
                      )}
                    </button>
                  </>
                )}

                {/* CARD */}
                {openMethod === "card" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Card Number</label>
                      <div className="flex items-center gap-2 border rounded-2xl px-3.5 py-3 bg-white focus-within:ring-2" style={{ borderColor: "#e5e7eb" }}>
                        <input placeholder="1234 5678 9012 3456" inputMode="numeric" className="flex-1 text-sm text-gray-900 outline-none bg-transparent" />
                        <CreditCard className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Expiry</label>
                        <input placeholder="MM / YY" className="w-full border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 bg-white text-gray-900" style={{ borderColor: "#e5e7eb" }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">CVV</label>
                        <input placeholder="123" type="password" className="w-full border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 bg-white text-gray-900" style={{ borderColor: "#e5e7eb" }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Cardholder Name</label>
                      <input placeholder="John Doe" className="w-full border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 bg-white text-gray-900" style={{ borderColor: "#e5e7eb" }} />
                    </div>
                    <div className="border-t pt-3 space-y-2" style={{ borderColor: "#f3f4f6" }}>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Amount</span><span className="font-semibold text-gray-900">{format(amount)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Fee</span><span className="font-semibold text-gray-900">{format(fee)}</span></div>
                    </div>
                    <button className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                      style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}>
                      <Lock className="w-4 h-4" /> Pay {format(total)}
                    </button>
                    <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Secure · Encrypted · Safe</p>
                  </>
                )}

                {/* WHATSAPP */}
                {openMethod === "whatsapp" && (
                  <>
                    <div className="flex flex-col items-center py-4 gap-3">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#dcfce7" }}>
                        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="#25D366">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <p className="text-sm text-center text-gray-500 px-4">You will be redirected to WhatsApp to complete your payment securely.</p>
                    </div>
                    <div className="border-t pt-3 space-y-2" style={{ borderColor: "#f3f4f6" }}>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Amount</span><span className="font-semibold text-gray-900">{format(amount)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Fee</span><span className="font-semibold text-gray-900">{format(fee)}</span></div>
                    </div>
                    <button onClick={handleWhatsAppPay} className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all" style={{ background: "#25D366" }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Continue on WhatsApp
                    </button>
                    <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Secure · Encrypted · Safe</p>
                  </>
                )}

                {/* BANK — dynamic: bankProviders comes from API config, falls back to default account */}
                {openMethod === "bank" && (
                  <>
                    <div className="rounded-2xl px-4 py-3 flex items-start gap-2 border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                      <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
                      <p className="text-[11px] text-gray-500">Please transfer the exact amount to the account below and use your payment reference as payment note.</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        ...(bankProviders.length > 0
                          ? bankProviders.flatMap((acc) => [
                              { label: "Bank Name", val: acc.name },
                              { label: "Account Name", val: acc.config?.accountName || "" },
                              { label: "Account Number", val: acc.config?.accountNumber || "" },
                            ])
                          : [
                              { label: "Bank Name", val: "Stanbic Bank Zambia" },
                              { label: "Account Name", val: "KRYROS LIMITED" },
                              { label: "Account Number", val: "91200012345667" },
                            ]),
                        { label: "Reference", val: payRef },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#f3f4f6" }}>
                          <div>
                            <p className="text-[10px] text-gray-400">{label}</p>
                            <p className="text-sm font-bold text-gray-900">{val}</p>
                          </div>
                          <CopyBtn text={val} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 mb-2">Upload Payment Proof (Optional)</p>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-6 cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: "#d1d5db" }} onClick={() => fileRef.current?.click()}>
                        <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        <p className="text-xs font-semibold text-gray-700">{proofFile ?? "Choose File or Drag & Drop"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, PDF up to 10MB</p>
                        <input ref={fileRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setProofFile(e.target.files?.[0]?.name ?? null)} />
                      </label>
                    </div>
                    <div className="border-t pt-3 space-y-2" style={{ borderColor: "#f3f4f6" }}>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Amount</span><span className="font-semibold text-gray-900">{format(amount)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Fee</span><span className="font-semibold text-gray-900">{format(fee)}</span></div>
                    </div>
                    <button onClick={() => setPayStatus("waiting")} className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                      style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}>
                      <Check className="w-4 h-4" /> I Have Made the Transfer
                    </button>
                    <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Secure · Encrypted · Safe</p>
                  </>
                )}
              </div>
            )}

            <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Secure · Encrypted · Safe
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
