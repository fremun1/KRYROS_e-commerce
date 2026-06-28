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
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type as string);
        setApiMethodTypes(enabledTypes);
      })
      .catch(() => {});

    // Fetch global settings for WhatsApp number and fee rate
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then((settings: any) => {
        const arr = Array.isArray(settings) ? settings : settings?.data || [];
        const rate = arr.find((s: any) => s.key === "processing_fee_rate")?.value;
        if (rate) setFeeRate(Number(rate) / 100);
        const wa = arr.find((s: any) => s.key === "whatsapp_number")?.value;
        if (wa && wa.trim()) setWhatsappNumber(wa.replace(/[^0-9]/g, ""));
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
    const contact = receiptContact.trim();
    const phone = receiptPhone.trim() || (!contact.includes("@") ? contact : "");
    const email = receiptEmail.trim() || (contact.includes("@") ? contact : "");
    if (!phone && !email) return;
    fetch(`${API_BASE}/api/notifications/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify({
        phone,
        email,
        orderRef: receiptData.transactionId,
        amount: receiptData.amount,
        currency: receiptData.currency,
        customerName: customerName.trim() || "Customer",
        paymentMethod: receiptData.operatorName || "Mobile Money",
      }),
    }).catch(() => {});
  }, [receiptContact, receiptPhone, receiptEmail, customerName, token]);

  const handlePaymentRequest = useCallback(async () => {
    if (!mmPhone) { setPayError("Please enter your phone number"); return; }
    setPayLoading(true); setPayError(null); setPayStatus("sending");
    try {
      const exchangeRate = selectedCurrency.exchangeRate || 1;
      const totalZMW = total * exchangeRate;
      const res = await fetch(`${API_BASE}/api/payments/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({
          phone: mmPhone,
          amount: totalZMW,
          currency: "ZMW",
          note: note || payRef,
          paymentLinkId: paymentLinkId || undefined,
          customerName,
          customerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Payment initiation failed");
      setOrderId(data.paymentId); // paymentId from DirectPayment model
      if (data.trackingLink) {
        navigate(data.trackingLink);
      } else {
        setPayStatus("waiting");
      }
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 24) { stopPolling(); setPayStatus("failed"); setPayError("Payment timeout. Please try again."); return; }
        try {
          const statusRes = await fetch(`${API_BASE}/api/payments/direct-status/${data.paymentId}`, {
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
          });
          const statusData = await statusRes.json();
          if (statusData.status === "paid") {
            stopPolling(); const receiptData = buildReceipt(statusData);
            setReceipt(receiptData); setPayStatus("paid"); sendReceiptNotification(receiptData);
          } else if (statusData.status === "failed") {
            stopPolling(); setPayStatus("failed"); setPayError(statusData.message || "Payment failed");
          }
        } catch (err) {
          console.error("Status check error:", err);
        }
      }, 5000);
    } catch (err: any) {
      setPayError(err.message || "Payment request failed");
      setPayStatus("idle");
    } finally {
      setPayLoading(false);
    }
  }, [mmPhone, total, selectedCurrency, payRef, note, token, stopPolling, buildReceipt, sendReceiptNotification]);

  const isPaid = payStatus === "paid";
  const isFailed = payStatus === "failed";
  const isWaiting = payStatus === "waiting" && !isPaid && !isFailed;

  if (isPaid && receipt) return <ReceiptScreen receipt={receipt} onClose={() => { setPayStatus("idle"); setReceipt(null); }} />;

  if (linkLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
        <div className="w-full max-w-sm rounded-3xl border border-card-border bg-card p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 border-4 flex items-center justify-center" style={{ borderColor: "rgba(39, 185, 175, 0.25)" }}>
            <span className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(39,185,175,0.4)", borderTopColor: "var(--kryros-primary)" }} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Loading payment page</h2>
          <p className="text-sm text-muted-foreground">We’re preparing the payment details for this link.</p>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
        <div className="w-full max-w-sm rounded-3xl border border-card-border bg-card p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">This payment page is unavailable</h2>
          <p className="text-sm text-muted-foreground mb-5">{linkError}</p>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl font-semibold text-sm text-white" style={{ background: "linear-gradient(135deg, var(--kryros-primary-hover), var(--kryros-primary))" }}>
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isWaiting || isFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl overflow-hidden" style={{ background: isFailed ? "linear-gradient(160deg,#3a0000 0%,#7a1a1a 100%)" : "linear-gradient(160deg,#07392f 0%,#0a5544 100%)" }}>
            <div className="p-8 text-center">
              {isFailed ? (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-400/20 border-4 border-red-400">
                  <X className="w-8 h-8 text-red-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4" style={{ borderColor: "var(--kryros-primary)", background: "rgba(39, 185, 175, 0.2)" }}>
                  <span className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(39, 185, 175, 0.4)", borderTopColor: "var(--kryros-primary)" }} />
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

  // ─── Pay Now button handler ───────────────────────────────────────────────
  const handlePayNow = async () => {
    if (openMethod === "mobile") handlePaymentRequest();
    else if (openMethod === "whatsapp") {
      setPayLoading(true); setPayError(null);
      try {
        const exchangeRate = selectedCurrency.exchangeRate || 1;
        const totalZMW = total * exchangeRate;
        const res = await fetch(`${API_BASE}/api/payments/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({
            phone: receiptContact ? String(receiptContact) : undefined,
            amount: totalZMW,
            currency: "ZMW",
            note: note || `WhatsApp payment for ${currency} ${total.toFixed(2)}`,
            reference: payRef,
            paymentLinkId: paymentLinkId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create payment record");
        const msg = encodeURIComponent(
          `I want to pay ${currency} ${total.toFixed(2)} for reference ${payRef}\n\n` +
          `Payment Number: ${data.paymentNumber || payRef}\n` +
          `Phone: ${receiptContact || "Not provided"}\n` +
          `${data.trackingLink ? `Tracking Link: ${window.location.origin}${data.trackingLink}` : ""}`,
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, "_blank");
        if (data.trackingLink) navigate(data.trackingLink);
      } catch (err: any) {
        setPayError(err.message || "Failed to initiate WhatsApp payment");
      } finally {
        setPayLoading(false);
      }
    }
  };

  // ─── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-0 pb-10">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
          </button>
          <h1 className="text-base font-bold text-foreground">Payment</h1>
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--kryros-primary)" }}>
            <Lock className="w-3.5 h-3.5" /> Secure Payment
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Amount entry
        ════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="px-4 py-4 space-y-4">
            <p className="text-sm font-bold text-foreground">Amount</p>

            <div className="relative">
              <div className="flex h-[52px] rounded-xl bg-card border border-border overflow-hidden shadow-sm">
                <div className="min-w-[96px] flex items-center justify-center border-r border-border font-bold text-kryros-primary text-base gap-2">
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => { setCurrency(e.target.value); setShowCurrencyDrop(false); }}
                    disabled={isLinkedPayment}
                    aria-label="Currency"
                    className="border-0 bg-transparent font-bold text-kryros-primary text-base appearance-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-kryros-primary" />
                </div>
                <div className="flex-1 flex items-center justify-end pr-3 font-extrabold text-2xl text-foreground">
                  <input
                    id="amount"
                    value={rawAmount}
                    onChange={(e) => { if (!isLinkedPayment) setRawAmount(e.target.value.replace(/[^0-9.]/g, "")); }}
                    readOnly={isLinkedPayment}
                    placeholder="0.00"
                    inputMode="decimal"
                    aria-label="Amount"
                    className="border-0 outline-none font-extrabold text-2xl text-right w-full bg-transparent py-2 text-foreground"
                  />
                </div>
              </div>
            </div>

            {isLinkedPayment && (
              <div className="rounded-xl px-3 py-2 text-sm border" style={{ background: "rgba(39,185,175,0.08)", borderColor: "var(--kryros-primary)", color: "var(--foreground)" }}>
                <span className="font-bold">{linkedPaymentName || "Payment Link"}</span> — Amount pre-filled: <strong>{currency} {rawAmount}</strong>
                {note ? <span className="text-muted-foreground ml-1">· {note}</span> : null}
                {linkedExpiry ? <span className="text-muted-foreground ml-1">· Expires {new Date(linkedExpiry).toLocaleDateString("en-GB")}</span> : null}
              </div>
            )}

            <div>
              <p className="text-sm font-bold text-foreground mb-2">
                Reference <span className="text-xs font-semibold text-muted-foreground">(Optional)</span>
              </p>
              <div className="h-[46px] rounded-xl bg-card border border-border flex items-center gap-2 px-3 shadow-sm">
                <div className="w-5 h-5 flex items-center justify-center text-kryros-primary flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10v7a2 2 0 0 1-2 2H6l-4-4V4a2 2 0 0 1 2-2h9"/></svg>
                </div>
                <input
                  id="reference"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter reference"
                  aria-label="Reference (optional)"
                  maxLength={64}
                  className="border-0 outline-none text-sm text-muted-foreground w-full py-2 bg-transparent"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-foreground mb-2">
                Phone or Email <span className="text-xs font-semibold text-muted-foreground">(Optional)</span>
              </p>
              <div className="h-[46px] rounded-xl bg-card border border-border flex items-center gap-2 px-3 shadow-sm">
                <div className="w-5 h-5 flex items-center justify-center text-kryros-primary flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <input
                  id="phoneEmail"
                  value={receiptContact}
                  onChange={(e) => setReceiptContact(e.target.value)}
                  placeholder="Enter phone number or email"
                  aria-label="Phone or Email (optional)"
                  className="border-0 outline-none text-sm text-muted-foreground w-full py-2 bg-transparent"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">We'll send your receipt after payment.</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold text-muted-foreground">Amount</span>
                <span className="text-base font-bold text-foreground">{currency} {amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  Fee <Info className="w-3 h-3" />
                </span>
                <span className="text-base font-bold text-foreground">{currency} {fee.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-base font-extrabold text-foreground">Total Payable</span>
                <span className="text-lg font-black" style={{ color: "var(--kryros-primary)" }}>{currency} {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => amount > 0 && setStep(2)}
              disabled={amount <= 0}
              className="w-full h-[52px] rounded-xl border-0 text-white font-extrabold text-base cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, var(--kryros-primary-hover), var(--kryros-primary))",
                boxShadow: amount > 0 ? "0 8px 20px rgba(39,185,175,0.25)" : "none",
                opacity: amount > 0 ? 1 : 0.5,
              }}
              aria-label="Pay Now"
            >
              <Lock className="w-5 h-5" />
              Pay Now
            </button>

            <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 1l3 5 5 1-4 4 1 5-5-2-5 2 1-5L4 7l5-1z"/></svg>
              <div>100% Secure Payment</div>
            </div>
            <div className="text-center text-xs text-muted-foreground mt-0.5">
              Your payment is safe with <strong style={{ color: "var(--kryros-primary)" }}>KRYROS</strong>.
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Choose payment method
        ════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="px-4 space-y-5 pb-6">

            {/* "You are sending" header */}
            <div className="text-center pt-3 pb-1">
              <p className="text-sm text-muted-foreground">You are sending</p>
              <p
                className="text-4xl font-black mt-1 tracking-tight"
                style={{ color: "var(--kryros-primary)" }}
              >
                {currency} {total.toFixed(2)}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* ── Choose Payment Method ── */}
            <div>
              <p className="text-base font-bold text-foreground text-center mb-4">
                Choose Payment Method
              </p>

              {/* First 3 methods as cards */}
              <div className="grid grid-cols-3 gap-3">
                {activeMethods.slice(0, 3).map((m) => {
                  const isSelected = openMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setOpenMethod(isSelected ? null : m.id)}
                      className="flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-2xl border bg-card transition-all active:scale-95"
                      style={{
                        borderColor: isSelected ? "var(--kryros-primary)" : "hsl(var(--border))",
                        boxShadow: isSelected ? "0 0 0 1px var(--kryros-primary)" : undefined,
                      }}
                    >
                      {/* Icon circle */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: ICON_BG[m.icon] ?? "rgba(39,185,175,0.10)" }}
                      >
                        <MethodIconInner type={m.icon} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Extra methods (4th+) as list rows */}
              {activeMethods.length > 3 && (
                <div className="mt-3 space-y-2">
                  {activeMethods.slice(3).map((m) => {
                    const isSelected = openMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setOpenMethod(isSelected ? null : m.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border bg-card transition-all active:scale-[0.99]"
                        style={{ borderColor: isSelected ? "var(--kryros-primary)" : "hsl(var(--border))" }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: ICON_BG[m.icon] ?? "rgba(39,185,175,0.10)" }}
                        >
                          <MethodIconInner type={m.icon} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-foreground">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.sub}</p>
                        </div>
                        {m.comingSoon && (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            Coming Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {payError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(185,28,28,0.08)", color: "var(--kryros-danger)" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {payError}
              </div>
            )}

            {/* ── Mobile Money Panel ── */}
            {openMethod === "mobile" && (
              <div className="space-y-4">
                {/* Network dropdown */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground">Network</label>
                  <button
                    onClick={() => setShowProviderDrop(!showProviderDrop)}
                    className="w-full flex items-center justify-between px-4 h-[52px] rounded-xl border bg-card transition-colors hover:bg-muted"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    <span className="text-sm font-medium text-foreground">{mmProvider}</span>
                    <ChevronDown
                      className="w-5 h-5 text-muted-foreground transition-transform"
                      style={{ transform: showProviderDrop ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>
                  {showProviderDrop && (
                    <div className="mt-1 border rounded-xl bg-card shadow-lg overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
                      {mobileNetworks.map((net) => (
                        <button
                          key={net}
                          onClick={() => { setMmProvider(net); setShowProviderDrop(false); }}
                          className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors text-sm border-b last:border-0"
                          style={{
                            borderColor: "hsl(var(--border))",
                            color: mmProvider === net ? "var(--kryros-primary)" : "hsl(var(--foreground))",
                            fontWeight: mmProvider === net ? 700 : 500,
                            background: "transparent",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--muted))")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <span>{net}</span>
                          {mmProvider === net && <Check className="w-4 h-4" style={{ color: "var(--kryros-primary)" }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone Number input */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground">Phone Number</label>
                  <div
                    className="flex h-[52px] items-center rounded-xl border bg-card overflow-hidden"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    {/* Country code prefix */}
                    <div
                      className="px-4 h-full flex items-center border-r flex-shrink-0"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      <span className="text-sm font-semibold" style={{ color: "var(--kryros-primary)" }}>
                        +260
                      </span>
                    </div>
                    <input
                      value={mmPhone}
                      onChange={(e) => setMmPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder=""
                      inputMode="tel"
                      autoComplete="tel"
                      className="flex-1 h-full bg-transparent outline-none px-4 text-sm font-medium text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold mb-2 text-foreground" htmlFor="customerName">Your Name</label>
                  <input
                    id="customerName"
                    type="text"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-1 h-[52px] w-full rounded-xl border bg-card outline-none px-4 text-sm font-medium text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold mb-2 text-foreground" htmlFor="customerEmail">Your Email (Optional)</label>
                  <input
                    id="customerEmail"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="flex-1 h-[52px] w-full rounded-xl border bg-card outline-none px-4 text-sm font-medium text-foreground"
                  />
                </div>
              </div>
            )}

            {/* ── Card Payment Panel ── */}
            {openMethod === "card" && (
              <div className="rounded-xl border bg-card p-5 text-center space-y-3" style={{ borderColor: "hsl(var(--border))" }}>
                <CreditCard className="w-8 h-8 mx-auto text-blue-500" />
                <p className="text-sm font-semibold text-foreground">Card Payment</p>
                <p className="text-sm text-muted-foreground">Card payment integration coming soon.</p>
              </div>
            )}

            {/* ── Bank Transfer Panel ── */}
            {openMethod === "bank" && (
              <div className="space-y-3">
                {bankProviders.length > 0 ? (
                  <>
                    <p className="text-sm font-bold text-foreground">Transfer Details:</p>
                    {bankProviders.map((provider) => (
                      <div key={provider.name} className="border rounded-xl bg-card p-4" style={{ borderColor: "hsl(var(--border))" }}>
                        <p className="text-sm font-bold text-foreground mb-1">{provider.name}</p>
                        {provider.config?.accountName && <p className="text-xs text-muted-foreground">Account: {provider.config.accountName}</p>}
                        {provider.config?.accountNumber && (
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">Number: {provider.config.accountNumber}</p>
                            <CopyBtn text={provider.config.accountNumber} />
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="rounded-xl border bg-card p-5 text-center" style={{ borderColor: "hsl(var(--border))" }}>
                    <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Bank transfer not available</p>
                  </div>
                )}
              </div>
            )}

            {/* ── WhatsApp Panel ── */}
            {openMethod === "whatsapp" && (
              <div className="rounded-xl border bg-card p-5 text-center space-y-2" style={{ borderColor: "hsl(var(--border))" }}>
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: ICON_BG["whatsapp"] }}>
                  <MethodIconInner type="whatsapp" />
                </div>
                <p className="text-sm font-semibold text-foreground">Pay via WhatsApp</p>
                <p className="text-sm text-muted-foreground">Tap "Pay Now" to open WhatsApp and complete your payment.</p>
              </div>
            )}

            {/* ── Pay Now button — always visible ── */}
            <button
              onClick={handlePayNow}
              disabled={payLoading || (openMethod === "mobile" && !mmPhone)}
              className="w-full h-[56px] rounded-2xl text-white font-bold text-base flex items-center justify-between px-6 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--kryros-primary-hover) 0%, var(--kryros-primary) 100%)",
                boxShadow: "0 4px 16px rgba(39,185,175,0.30)",
              }}
            >
              <Lock className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-center">
                {payLoading ? "Processing…" : "Pay Now"}
              </span>
              <ChevronDown className="w-5 h-5 flex-shrink-0" />
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
