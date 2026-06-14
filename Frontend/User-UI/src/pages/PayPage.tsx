import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft, Lock, ChevronDown, ChevronRight, X,
  Smartphone, CreditCard, Building2, Check, Upload, AlertCircle, Download,
} from "lucide-react";
import { API_BASE, fetchSettings } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";

// FEE_RATE is now dynamic from settings








const DEFAULT_METHODS = [
  {
    id: "mobile",
    label: "Mobile Money",
    sub: "MTN, Airtel, Zamtel",
    icon: Smartphone,
    iconBg: "bg-primary/10",
    comingSoon: false,
  },
  {
    id: "card",
    label: "Card Payment",
    sub: "Visa, Mastercard & more",
    icon: CreditCard,
    iconBg: "bg-blue-50 dark:bg-blue-900/20",
    comingSoon: false,
  },
  {
    id: "bank",
    label: "Bank Transfer",
    sub: "Local & International",
    icon: Building2,
    iconBg: "bg-slate-50 dark:bg-slate-800",
    comingSoon: false,
  },
  {
    id: "whatsapp",
    label: "WhatsApp Payment",
    sub: "Pay securely on WhatsApp",
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    iconBg: "bg-primary/10",
    comingSoon: false,
  },

];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-primary font-semibold border border-primary/40 px-3 py-1 rounded-lg hover:bg-primary/5 transition-colors"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SecureFooter() {
  return (
    <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
      <Lock className="w-3 h-3" /> Secure &bull; Encrypted &bull; Safe
    </p>
  );
}

function AmountSummaryBar({ amount, fee, currency, format }: { amount: number; fee: number; currency: string; format: (val: number) => string }) {
  return (
    <div className="border-t border-border pt-4 mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-semibold text-foreground">{format(amount)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Processing Fees</span>
        <span className="font-semibold text-foreground">{format(fee)}</span>
      </div>
    </div>
  );
}

interface ReceiptData {
  recipientNumber: string;
  recipientName: string;
  operatorName: string;
  transactionId: string;
  dateTime: string;
  convenienceCharges: number;
  amount: number;
  currency: string;
  reference: string;
}

function ReceiptScreen({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const el = receiptRef.current;
    if (!el) return;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>KRYROS Receipt - ${receipt.reference}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 40px 16px; }
  .card { background: #fff; border-radius: 16px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  .header { background: #fff; padding: 32px 24px 20px; text-align: center; border-bottom: 1px solid #f0f0f0; }
  .icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: #22c55e; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  .checkmark { color: #fff; font-size: 28px; font-weight: bold; }
  .title { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 6px; }
  .subtitle { font-size: 13px; color: #555; line-height: 1.5; }
  .amount-highlight { color: var(--kryros-danger); font-weight: 700; }
  .body { padding: 20px 24px; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #f0f0f0; }
  .row:last-child { border-bottom: none; }
  .label { font-size: 13px; color: #888; flex: 1; }
  .value { font-size: 13px; font-weight: 600; color: #111; text-align: right; flex: 1; }
  .value.red { color: var(--kryros-danger); }
  .footer { padding: 16px 24px; text-align: center; background: #fafafa; border-top: 1px solid #f0f0f0; font-size: 11px; color: #aaa; }
  .kryros { font-weight: 700; color: #10b981; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon-wrap"><span class="checkmark">✓</span></div>
    <div class="title">Transaction Successful</div>
    <div class="subtitle">
      <span class="amount-highlight">${receipt.currency} ${receipt.amount.toFixed(1)}</span>
      has been successfully sent to<br/>KRYROS MOBILE TECH LIMITED (${receipt.recipientNumber}).
    </div>
  </div>
  <div class="body">
    <div class="row"><span class="label">Recipient Number</span><span class="value">${receipt.recipientNumber}</span></div>
    <div class="row"><span class="label">Recipient Name</span><span class="value">${receipt.recipientName}</span></div>
    <div class="row"><span class="label">Operator Name</span><span class="value">${receipt.operatorName}</span></div>
    <div class="row"><span class="label">Transaction ID</span><span class="value">${receipt.transactionId}</span></div>
    <div class="row"><span class="label">Transaction Date &amp; Time</span><span class="value">${receipt.dateTime}</span></div>
    <div class="row"><span class="label">Convenience Charges</span><span class="value red">${receipt.currency} ${receipt.convenienceCharges.toFixed(1)}</span></div>
    <div class="row"><span class="label">Amount</span><span class="value red">${receipt.currency} ${receipt.amount.toFixed(1)}</span></div>
  </div>
  <div class="footer">Powered by <span class="kryros">KRYROS</span> &bull; Secure &bull; Encrypted &bull; Safe</div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KRYROS-Receipt-${receipt.reference}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-4">

        {/* Receipt card */}
        <div ref={receiptRef} className="bg-white dark:bg-white rounded-3xl overflow-hidden shadow-xl border border-border">
          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1.5">Transaction Successful</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="text-red-500 font-bold">{receipt.currency} {receipt.amount.toFixed(1)}</span>
              {" "}has been successfully sent to<br />
              KRYROS MOBILE TECH LIMITED ({receipt.recipientNumber}).
            </p>
          </div>

          {/* Details */}
          <div className="px-6 py-2">
            {[
              { label: "Recipient Number", value: receipt.recipientNumber, red: false },
              { label: "Recipient Name", value: receipt.recipientName, red: false },
              { label: "Operator Name", value: receipt.operatorName, red: false },
              { label: "Transaction ID", value: receipt.transactionId, red: false },
              { label: "Transaction Date & Time", value: receipt.dateTime, red: false },
              { label: "Convenience Charges", value: `${receipt.currency} ${receipt.convenienceCharges.toFixed(1)}`, red: true },
              { label: "Amount", value: `${receipt.currency} ${receipt.amount.toFixed(1)}`, red: true },
            ].map(({ label, value, red }) => (
              <div key={label} className="flex items-start justify-between py-3.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500 flex-1">{label}</span>
                <span className={`text-sm font-semibold text-right flex-1 ${red ? "text-red-500" : "text-gray-900"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" /> Download Receipt
        </button>

        {/* Back home */}
        <Link href="/">
          <button className="w-full py-3.5 border border-border bg-background text-foreground rounded-2xl font-semibold text-sm hover:bg-muted transition-colors">
            Back to Home
          </button>
        </Link>

        <SecureFooter />
      </div>
    </div>
  );
}

export default function PayPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const { selected: selectedCurrency, currencies: allCurrencies, format, setCurrency: setGlobalCurrency } = useCurrencyStore();

  // ── Read URL query params (from admin payment link generator) ──
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlAmount = urlParams.get("amount") || "";
  const urlCurrency = urlParams.get("currency")?.toUpperCase();
  const urlNote = urlParams.get("note") || "";
  const isLinkedPayment = !!urlAmount;

  // If URL provides a currency, sync it to the global store once
  useEffect(() => {
    if (urlCurrency && allCurrencies.some(c => c.code === urlCurrency)) {
      setGlobalCurrency(urlCurrency);
    }
  }, [urlCurrency, allCurrencies, setGlobalCurrency]);

  const [rawAmount, setRawAmount] = useState(urlAmount);
  const [showCurrencyDrop, setShowCurrencyDrop] = useState(false);
  const [note, setNote] = useState(urlNote);

  const [openMethod, setOpenMethod] = useState<string | null>(null);

  const amount = parseFloat(rawAmount) || 0;
  const [feeRate, setFeeRate] = useState(0.01);
  const fee = Math.round(amount * feeRate * 100) / 100;
  const total = amount + fee;
  
  // Use code from store
  const currency = selectedCurrency.code;
  const setCurrency = setGlobalCurrency;
  const CURRENCIES = allCurrencies;

  // Mobile money
  const [mmProvider, setMmProvider] = useState("MTN");
  const [mmPhone, setMmPhone] = useState("");

  // Bank proof file
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "260969597029";
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [payRef, setPayRef] = useState(() => "PAY-" + Date.now().toString(36).toUpperCase().slice(-8));
  // ── Dynamic payment config (from admin panel) ─────────────────────────
  const [bankProviders, setBankProviders] = useState<{ name:string; config?:{ accountName?:string; accountNumber?:string } }[]>([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>(["MTN", "Airtel", "Zamtel"]);
  const [apiMethodTypes, setApiMethodTypes] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-config/public`)
      .then(r => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : (data?.data ?? []);

        // Bank accounts
        const bankMethod = arr.find((m: any) => m.type === "bank");
        if (bankMethod?.providers) {
          setBankProviders(bankMethod.providers.filter((p: any) => p.isEnabled));
        }

        // Mobile money networks (extracted from providers → networks)
        const mobileMethod = arr.find((m: any) => m.type === "mobile_wallet");
        if (mobileMethod?.providers?.length > 0) {
          const nets: string[] = mobileMethod.providers
            .filter((p: any) => p.isEnabled)
            .flatMap((p: any) =>
              (p.networks || [])
                .filter((n: any) => n.isEnabled)
                .map((n: any) => {
                  return n.name; // Just the network name: MTN, Airtel, Zamtel
                })
            );
          if (nets.length > 0) {
            setMobileNetworks(nets);
            setMmProvider(nets[0]);
          }
        }

        // Store enabled method types (in admin-configured order)
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type as string);
        setApiMethodTypes(enabledTypes);
      })
      .catch(() => {});

    fetchSettings()
      .then((settings) => {
        const rate = settings.find((s: any) => s.key === 'processing_fee_rate')?.value;
        if (rate) setFeeRate(Number(rate) / 100);
      })
      .catch(() => {});
  }, []);

  // Map API types to DEFAULT_METHODS entries (preserves existing panel logic)
  const TYPE_TO_ID: Record<string, string> = {
    mobile_wallet: "mobile",
    card:          "card",
    bank:          "bank",
    cash:          "cod",
    digital_wallet:"whatsapp",
    whatsapp:      "whatsapp",
  };
  const activeMethods = apiMethodTypes.length > 0
    ? (apiMethodTypes
        .map((t) => DEFAULT_METHODS.find((m) => m.id === (TYPE_TO_ID[t] ?? t)))
        .filter(Boolean) as typeof DEFAULT_METHODS)
    : [...DEFAULT_METHODS];
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payStatus, setPayStatus] = useState<"idle" | "sending" | "waiting" | "paid" | "failed">("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Receipt contact fields
  const [receiptPhone, setReceiptPhone] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = useAuthStore((s) => s.token);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const buildReceipt = useCallback((data: { orderId?: string; reference?: string; raw?: any }) => {
    const providerName = mmProvider.replace(" Mobile Money", "").replace(" Money", "");
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
      ", " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    return {
      recipientNumber: "966629719",
      recipientName: "KRYROS MOBILE TECH LIMITED",
      operatorName: providerName,
      transactionId: data.reference || data.orderId || payRef,
      dateTime: dateStr,
      convenienceCharges: fee,
      amount: total,
      currency,
      reference: payRef,
    } as ReceiptData;
  }, [mmProvider, fee, total, currency, payRef]);

  // Fire receipt via SMS and/or email (fire-and-forget)
  const sendReceiptNotification = useCallback((receiptData: ReceiptData) => {
    const phone = receiptPhone.trim();
    const email = receiptEmail.trim();
    if (!phone && !email) return;
    fetch(`${API_BASE}/api/notifications/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone || undefined,
        email: email || undefined,
        orderRef: receiptData.reference,
        amount: receiptData.amount.toFixed(2),
        currency: receiptData.currency,
        customerName: "Customer",
        paymentMethod: receiptData.operatorName || "Direct Payment",
        status: "completed",
      }),
    }).catch(() => {}); // silent — never block the UI
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
          setPayStatus("paid");
          setReceipt(r);
          sendReceiptNotification(r);
        } else if (status === "FAILED") {
          stopPolling();
          setPayStatus("failed");
          setPayError("Payment was declined or cancelled.");
          setPayLoading(false);
        }
      } catch {
        // keep polling
      }
    }, 5000);
  }, [token, stopPolling, buildReceipt, sendReceiptNotification]);

  const handleMobileMoneyPay = async () => {
    if (!mmPhone || mmPhone.trim().length < 9) {
      setPayError("Please enter a valid mobile money number.");
      return;
    }
    if (amount <= 0) {
      setPayError("Please enter a valid amount.");
      return;
    }

    setPayError(null);
    setPayLoading(true);
    setPayStatus("sending");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/payments/direct`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: mmPhone.trim(),
          amount: Math.round(total * 100) / 100,
          currency,
          note: note || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message || "Payment could not be started. Please try again.";
        setPayError(Array.isArray(msg) ? msg.join(", ") : msg);
        setPayLoading(false);
        setPayStatus("idle");
        return;
      }

      const newOrderId = data.orderId as string;
      const newRef = data.reference || data.orderNumber || payRef;
      setOrderId(newOrderId);
      setPayRef(newRef);
      setPayStatus("waiting");
      setPayLoading(false);
      startPolling(newOrderId);
    } catch {
      setPayError("Network error. Please check your connection and try again.");
      setPayLoading(false);
      setPayStatus("idle");
    }
  };

  const handleWhatsAppPay = () => {
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 7) {
      alert("WhatsApp number is not configured. Please contact KRYROS support.");
      return;
    }
    const msg =
      `Hi KRYROS! 💳 *Direct Payment Request*\n\n` +
      `*Reference:* ${payRef}\n` +
      `*Amount:* ${currency} ${total.toFixed(2)}\n` +
      (note ? `*Note:* ${note}\n` : "") +
      `\nPlease confirm this payment. Thank you!`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setPayStatus("waiting");
  };

  const isPaid = payStatus === "paid";
  const isFailed = payStatus === "failed";
  const isWaiting = payStatus === "waiting" && !isPaid && !isFailed;

  // Show receipt screen on paid
  if (isPaid && receipt) {
    return <ReceiptScreen receipt={receipt} onClose={() => { setPayStatus("idle"); setReceipt(null); }} />;
  }

  // Waiting / failed screen
  if (isWaiting || isFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: isFailed
                ? "linear-gradient(160deg, #3a0000 0%, #7a1a1a 100%)"
                : "linear-gradient(160deg, #07392f 0%, #0a5544 100%)",
            }}
          >
            <div className="p-8 text-center">
              {isFailed ? (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-400/20 border-4 border-red-400">
                  <X className="w-8 h-8 text-red-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary/20 border-4 border-primary">
                  <span className="w-7 h-7 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                </div>
              )}

              <h2 className="text-xl font-black text-white mb-1">
                {isFailed ? "Payment Failed" : "Waiting for Approval"}
              </h2>

              <p className="text-white/60 text-sm mb-6">
                {isFailed
                  ? (payError || "The payment was not completed. Please try again.")
                  : `A payment prompt has been sent to ${mmPhone || "your phone"}. Please open your ${mmProvider} app and approve to complete payment.`}
              </p>

              <div className="bg-white/10 rounded-2xl p-4 text-left space-y-2.5 mb-6">
                {[
                  ["Reference", payRef],
                  ["Amount", `${currency} ${total.toFixed(2)}`],
                  ["Phone", mmPhone || "—"],
                  ["Status", isFailed ? "❌ Failed" : "⏳ Awaiting Approval"],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">{label}</span>
                    <span className="text-white text-xs font-bold">{val}</span>
                  </div>
                ))}
              </div>

              {isFailed ? (
                <button
                  onClick={() => {
                    setPayStatus("idle");
                    setPayError(null);
                    setOrderId(null);
                    setOpenMethod("mobile");
                  }}
                  className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-400 transition-colors"
                >
                  Try Again
                </button>
              ) : (
                <p className="text-white/40 text-xs">Checking status automatically every 5 seconds…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-8 relative lg:max-w-5xl lg:px-8 lg:py-8">
      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-black text-foreground">Pay</h1>
        <div className="flex items-center gap-1 text-[11px] text-primary font-semibold">
          <Lock className="w-3 h-3" /> Secure Payment
        </div>
      </div>

      {/* STEP 1 — Enter Amount */}
      {step === 1 && (
        <div className="space-y-4 lg:flex lg:flex-row lg:gap-8 lg:items-start lg:space-y-0">
          <div className="space-y-4 lg:flex-1">
          <div>
            <h2 className="text-xl font-black text-foreground">Make a Payment</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Send money securely to KRYROS</p>
          </div>
          {isLinkedPayment && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <span className="font-bold">Payment Link</span> — Amount pre-filled: <strong>{currency} {rawAmount}</strong>
              {urlNote ? <span className="text-muted-foreground ml-1">· {urlNote}</span> : null}
            </div>
          )}

          {/* Amount input */}
          <div className="border border-border rounded-xl px-4 py-2.5 bg-background focus-within:border-primary/60 transition-colors flex items-center gap-3">
            <span className="text-muted-foreground/50">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5s2 .7 2 1.8c0 2.2-4.5 2.2-4.5 5.2h4.5"/><line x1="12" y1="17" x2="12" y2="18"/></svg>
            </span>
            <input
              value={rawAmount}
              onChange={(e) => { if (!isLinkedPayment) setRawAmount(e.target.value.replace(/[^0-9.]/g, "")); }}
              readOnly={isLinkedPayment}
              placeholder="Enter Amount"
              inputMode="decimal"
              className={`flex-1 text-sm font-semibold text-foreground outline-none bg-transparent placeholder:text-muted-foreground/50 py-1 ${isLinkedPayment ? "cursor-default select-none" : ""}`}
            />
          </div>

          {/* Currency selector row */}
          <button
            onClick={() => setShowCurrencyDrop(!showCurrencyDrop)}
            className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-left hover:border-primary/50 hover:bg-primary/[0.02] transition-colors flex items-center gap-3"
          >
            <span className="text-muted-foreground/50">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </span>
            <span className="flex-1 text-sm font-semibold text-foreground">{currency}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${showCurrencyDrop ? "rotate-180" : ""}`} />
          </button>

          {/* Currency dropdown */}
          {showCurrencyDrop && (
            <div className="border border-border rounded-2xl bg-card shadow-lg overflow-hidden">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); setShowCurrencyDrop(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted transition-colors text-sm ${currency === c.code ? "bg-primary/5 font-bold text-primary" : "text-foreground"}`}
                >
                  <span className="font-semibold">{c.code}</span>
                  {currency === c.code && <span className="ml-auto text-primary text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Note / Reference */}
          <div className="border border-border rounded-xl px-4 py-2.5 bg-background focus-within:border-primary/60 transition-colors flex items-center gap-3">
            <span className="text-muted-foreground/50 flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reference (optional)"
              className="flex-1 text-sm font-semibold text-foreground outline-none bg-transparent placeholder:text-muted-foreground/50 py-1"
            />
          </div>

          {/* Receipt contact */}
          <div className="border border-border rounded-2xl px-4 py-4 bg-background space-y-3">
            <p className="text-sm font-bold text-foreground">Receipt Contact <span className="text-muted-foreground font-normal text-xs">(optional)</span></p>
            <p className="text-[11px] text-muted-foreground -mt-1">Get your receipt sent automatically after payment.</p>
            <div className="flex items-center gap-3 border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary/60 transition-colors bg-background">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <input
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value.replace(/[^0-9+\s-]/g, ""))}
                placeholder="Enter your phone number for SMS receipt"
                inputMode="tel"
                className="flex-1 text-sm text-foreground outline-none bg-transparent placeholder:text-muted-foreground/50 py-0.5"
              />
            </div>
            <div className="flex items-center gap-3 border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary/60 transition-colors bg-background">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
              <input
                value={receiptEmail}
                onChange={(e) => setReceiptEmail(e.target.value)}
                placeholder="Enter your email for receipt notification"
                inputMode="email"
                type="email"
                className="flex-1 text-sm text-foreground outline-none bg-transparent placeholder:text-muted-foreground/50 py-0.5"
              />
            </div>
          </div>

          {/* Payment Summary — mobile only */}
          <div className="border border-border rounded-2xl px-4 py-4 bg-background space-y-2 lg:hidden">
            <p className="text-sm font-bold text-foreground mb-3">Payment Summary</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-foreground">{format(amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Processing Fee</span>
              <span className="font-semibold text-foreground">{format(fee)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t border-border">
              <span className="text-foreground">Total Payable</span>
              <span className="text-primary">{format(total)}</span>
            </div>
          </div>

          <button
            onClick={() => amount > 0 && setStep(2)}
            disabled={amount <= 0}
            className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all
              ${amount > 0 ? "bg-primary text-white hover:bg-primary/90 active:scale-95" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
          >
            <Lock className="w-4 h-4" /> Continue to Payment
          </button>
          <SecureFooter />
          </div>{/* end left-col */}

          {/* Desktop sticky payment summary */}
          <div className="hidden lg:block w-80 flex-shrink-0 sticky top-6 border border-border rounded-2xl px-5 py-5 bg-background space-y-3">
            <p className="text-sm font-bold text-foreground">Payment Summary</p>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-foreground">{format(amount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Processing Fee</span><span className="font-semibold text-foreground">{format(fee)}</span></div>
            <div className="flex justify-between text-sm font-black pt-3 border-t border-border"><span className="text-foreground">Total Payable</span><span className="text-primary">{format(total)}</span></div>
            <SecureFooter />
          </div>
        </div>
      )}

      {/* STEP 2 — Choose Payment Method */}
      {step === 2 && (
        <div className="space-y-4 lg:flex lg:flex-row-reverse lg:gap-8 lg:items-start lg:space-y-0">
          <div className="space-y-1 lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 lg:border lg:border-border lg:rounded-2xl lg:p-5 lg:bg-background">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">You are sending</span>
              <button onClick={() => setStep(1)} className="text-xs text-primary font-semibold hover:underline">Change</button>
            </div>
            <p className="text-3xl font-black text-foreground">{format(total)}</p>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-foreground">{format(amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Processing Fee</span>
                <span className="font-semibold text-foreground">{format(fee)}</span>
              </div>
            </div>
          </div>

          <div className="lg:flex-1">
            <p className="text-sm font-bold text-foreground mb-3">Choose payment method</p>
            <div className="space-y-2">
              {activeMethods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setOpenMethod(m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02] active:scale-[0.99] transition-all text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${m.iconBg}`}>
                      <Icon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.id === "mobile" ? mobileNetworks.join(", ") : m.sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT METHOD PANELS (bottom sheet) */}
      {openMethod && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center lg:p-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpenMethod(null)}
          />
          <div className="relative bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto lg:rounded-3xl lg:max-w-xl lg:w-full">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* Sheet header */}
              <div className="flex items-center justify-between pt-1 pb-2">
                {(() => {
                  const m = activeMethods.find((x) => x.id === openMethod);
                  if (!m) return null;
                  const Icon = m.icon;
                  return (
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.iconBg}`}>
                        <Icon />
                      </div>
                      <span className="text-base font-black text-foreground">{m.label}</span>
                    </div>
                  );
                })()}
                <button
                  onClick={() => setOpenMethod(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {/* MOBILE MONEY */}
              {openMethod === "mobile" && (
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Provider</label>
                    <button
                      type="button"
                      onClick={() => setShowProviderDrop((v) => !v)}
                      className="w-full flex items-center gap-2.5 border border-border rounded-2xl px-3.5 py-3 bg-background hover:border-primary/50 transition-colors"
                    >
                      <Smartphone className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm font-semibold text-foreground text-left">{mmProvider}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${showProviderDrop ? "rotate-180" : ""}`} />
                    </button>
                    {showProviderDrop && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
                        {mobileNetworks.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => { setMmProvider(name); setShowProviderDrop(false); }}
                            className={`w-full flex items-center px-4 py-3.5 text-left hover:bg-muted transition-colors border-b border-border last:border-0 ${mmProvider === name ? "bg-primary/5" : ""}`}
                          >
                            <span className={`text-sm font-semibold flex-1 ${mmProvider === name ? "text-primary" : "text-foreground"}`}>{name}</span>
                            {mmProvider === name && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Mobile Money Number</label>
                    <div className="flex items-center gap-2 border border-border rounded-2xl px-3.5 py-3 bg-background focus-within:ring-2 focus-within:ring-primary/30">
                      <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <input
                        value={mmPhone}
                        onChange={(e) => setMmPhone(e.target.value)}
                        placeholder="Enter your mobile money number"
                        type="tel"
                        className="flex-1 text-sm text-foreground outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3">
                    <p className="text-[11px] text-muted-foreground">
                      A payment prompt will be sent to your mobile phone. Please approve it to complete the payment.
                    </p>
                  </div>

                  {payError && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-red-600 dark:text-red-400">{payError}</p>
                    </div>
                  )}

                  <AmountSummaryBar amount={amount} fee={fee} currency={currency} format={format} />

                  <button
                    onClick={handleMobileMoneyPay}
                    disabled={payLoading}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {payLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {payStatus === "sending" ? "Sending prompt…" : "Processing…"}
                      </>
                    ) : (
                      <><Smartphone className="w-4 h-4" /> Pay {format(total)}</>
                    )}
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* BANK TRANSFER */}
              {openMethod === "bank" && (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3 flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Please transfer the exact amount to the account below and use your payment reference as payment note.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      ...( bankProviders.length > 0
                        ? bankProviders.flatMap((acc) => [
                            { label: "Bank Name",      val: acc.name },
                            { label: "Account Name",   val: acc.config?.accountName   || "" },
                            { label: "Account Number", val: acc.config?.accountNumber || "" },
                          ])
                        : [
                            { label: "Bank Name",      val: "Stanbic Bank Zambia" },
                            { label: "Account Name",   val: "KRYROS LIMITED"       },
                            { label: "Account Number", val: "91200012345667"       },
                          ]
                      ),
                      { label: "Reference", val: payRef },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="text-sm font-bold text-foreground">{val}</p>
                        </div>
                        <CopyBtn text={val} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2">Upload Payment Proof (Optional)</p>
                    <label
                      className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-6 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                      <p className="text-xs font-semibold text-foreground">{proofFile ?? "Choose File or Drag & Drop"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, PDF up to 10MB</p>
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept=".png,.jpg,.jpeg,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0]?.name ?? null)}
                      />
                    </label>
                  </div>
                  <AmountSummaryBar amount={amount} fee={fee} currency={currency} format={format} />
                  <button
                    onClick={() => setPayStatus("waiting")}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" /> I Have Made the Transfer
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* WHATSAPP */}
              {openMethod === "whatsapp" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-6 gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-9 h-9" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <p className="text-sm text-center text-muted-foreground px-4">
                      You will be redirected to WhatsApp to complete your payment securely.
                    </p>
                  </div>
                  <AmountSummaryBar amount={amount} fee={fee} currency={currency} format={format} />
                  <button
                    onClick={handleWhatsAppPay}
                    className="w-full py-4 bg-[var(--kryros-primary-hover)] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1ebe5d] active:scale-95 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Continue on WhatsApp
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* CARD PAYMENT */}
              {openMethod === "card" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Card Number</label>
                    <div className="flex items-center gap-2 border border-border rounded-2xl px-3.5 py-3 bg-background focus-within:ring-2 focus-within:ring-primary/30">
                      <input
                        placeholder="1234 5678 9012 3456"
                        inputMode="numeric"
                        className="flex-1 text-sm text-foreground outline-none bg-transparent"
                      />
                      <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Expiry Date</label>
                      <input
                        placeholder="MM / YY"
                        className="w-full border border-border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">CVV</label>
                      <input
                        placeholder="123"
                        type="password"
                        className="w-full border border-border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Cardholder Name</label>
                    <input
                      placeholder="John Doe"
                      className="w-full border border-border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground"
                    />
                  </div>
                  <AmountSummaryBar amount={amount} fee={fee} currency={currency} format={format} />
                  <button
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    <Lock className="w-4 h-4" /> Pay {format(total)}
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* APPLE PAY */}
              {openMethod === "apple" && (
                <div className="space-y-4">
                  <p className="text-xs text-center text-muted-foreground">Authenticate with Face ID or Touch ID to complete payment.</p>
                  <AmountSummaryBar amount={amount} fee={fee} currency={currency} format={format} />
                  <button
                    className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                    style={{ background: "#000", color: "#fff" }}
                  >
                     Buy with Apple Pay
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* GOOGLE PAY */}
              {openMethod === "google" && (
                <div className="space-y-4">
                  <p className="text-xs text-center text-muted-foreground">You'll be redirected to Google Pay to complete your payment.</p>
                  <AmountSummaryBar amount={amount} fee={fee} currency={currency} format={format} />
                  <button
                    className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all border border-border"
                    style={{ background: "#fff", color: "#000" }}
                  >
                    <span className="font-black text-lg">
                      <span className="text-blue-500">G</span>
                      <span className="text-red-500">o</span>
                      <span className="text-yellow-500">o</span>
                      <span className="text-blue-500">g</span>
                      <span className="text-green-500">l</span>
                      <span className="text-red-500">e</span>
                    </span>
                    &nbsp;Pay
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* CRYPTO — Coming Soon */}
              {openMethod === "crypto" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-10 gap-3">
                    <span className="text-5xl font-black text-orange-500">₿</span>
                    <p className="text-base font-bold text-foreground">Coming Soon</p>
                    <p className="text-sm text-center text-muted-foreground px-4">
                      Crypto payments (USDT, BTC & more) are coming soon. Stay tuned!
                    </p>
                  </div>
                  <SecureFooter />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
