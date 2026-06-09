import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft, Lock, ChevronDown, ChevronRight, X,
  Smartphone, CreditCard, Building2, Check, Upload, AlertCircle, Download,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const FEE_RATE = 0.01;

function calcFee(amount: number) {
  return Math.round(amount * FEE_RATE * 100) / 100;
}

const CURRENCIES = [
  { code: "USD", label: "US Dollar", flag: "🇺🇸" },
  { code: "ZMW", label: "Zambian Kwacha", flag: "🇿🇲" },
  { code: "GHS", label: "Ghanaian Cedi", flag: "🇬🇭" },
  { code: "NGN", label: "Nigerian Naira", flag: "🇳🇬" },
  { code: "KES", label: "Kenyan Shilling", flag: "🇰🇪" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧" },
];

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

function AmountSummaryBar({ amount, fee, currency }: { amount: number; fee: number; currency: string }) {
  return (
    <div className="border-t border-border pt-4 mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-semibold text-foreground">{currency} {amount.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Fee</span>
        <span className="font-semibold text-foreground">{currency} {fee.toFixed(2)}</span>
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

  // ── Read URL query params (from admin payment link generator) ──
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlAmount = urlParams.get("amount") || "";
  const urlCurrency = urlParams.get("currency") || "ZMW";
  const urlNote = urlParams.get("note") || "";
  const isLinkedPayment = !!urlAmount;

  const [rawAmount, setRawAmount] = useState(urlAmount);
  const [currency, setCurrency] = useState(urlCurrency);
  const [showCurrencyDrop, setShowCurrencyDrop] = useState(false);
  const [note, setNote] = useState(urlNote);

  const [openMethod, setOpenMethod] = useState<string | null>(null);

  const amount = parseFloat(rawAmount) || 0;
  const fee = calcFee(amount);
  const total = amount + fee;
  const currencyObj = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  // Mobile money
  const [mmProvider, setMmProvider] = useState("");
  const [mmPhone, setMmPhone] = useState("");

  // Bank proof file
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "260969597029";
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [payRef, setPayRef] = useState(() => "PAY-" + Date.now().toString(36).toUpperCase().slice(-8));
  // ── Dynamic payment config (from admin panel) ─────────────────────────
  const [bankProviders, setBankProviders] = useState<{ name:string; config?:{ accountName?:string; accountNumber?:string } }[]>([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>([]);
  const [apiMethodTypes, setApiMethodTypes] = useState<string[]>([]);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

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
                .map((n: any) => n.name)
            );
          setMobileNetworks(nets);
          if (nets.length > 0) setMmProvider(nets[0]);
        }

        // Store enabled method types (in admin-configured order)
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type as string);
        setApiMethodTypes(enabledTypes);
        setIsConfigLoaded(true);
      })
      .catch(() => {
        setIsConfigLoaded(true);
      });
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
  
  const activeMethods = isConfigLoaded 
    ? apiMethodTypes
        .map((t) => DEFAULT_METHODS.find((m) => m.id === (TYPE_TO_ID[t] ?? t)))
        .filter(Boolean) as typeof DEFAULT_METHODS
    : [];

  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const handleMobilePay = async () => {
    if (!mmPhone) return;
    setPaymentStatus("processing");
    // Simulate API call for mobile money
    setTimeout(() => {
      setReceipt({
        recipientNumber: "0969597029",
        recipientName: "KRYROS MOBILE TECH LIMITED",
        operatorName: mmProvider,
        transactionId: "TX-" + Math.random().toString(36).toUpperCase().slice(-8),
        dateTime: new Date().toLocaleString(),
        convenienceCharges: fee,
        amount: total,
        currency: currency,
        reference: payRef,
      });
      setPaymentStatus("success");
    }, 2000);
  };

  if (paymentStatus === "success" && receipt) {
    return <ReceiptScreen receipt={receipt} onClose={() => setPaymentStatus("idle")} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Secure Payment</span>
        </div>
      </div>

      <div className="flex-1 px-5 py-2 space-y-6 overflow-y-auto">
        {/* Amount Input Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black">Enter Amount</h1>
            <div className="relative">
              <button
                onClick={() => setShowCurrencyDrop(!showCurrencyDrop)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all"
              >
                <span className="text-sm font-bold">{currencyObj.flag} {currencyObj.code}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showCurrencyDrop && (
                <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setShowCurrencyDrop(false); }}
                      className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted flex items-center gap-2 border-b border-border last:border-0"
                    >
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground group-focus-within:text-primary transition-colors">
              {currencyObj.code === "ZMW" ? "K" : "$"}
            </div>
            <input
              type="number"
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-muted/30 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-3xl px-12 py-6 text-3xl font-black outline-none transition-all placeholder:text-muted-foreground/30"
              readOnly={isLinkedPayment}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground ml-1">Payment Note (Optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is this payment for?"
              className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-primary/40 transition-all"
              readOnly={isLinkedPayment}
            />
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground px-1">Select Payment Method</h2>
          <div className="space-y-3">
            {activeMethods.length > 0 ? (
              activeMethods.map((method) => {
                const isSelected = openMethod === method.id;
                const Icon = method.icon;
                return (
                  <div key={method.id} className="space-y-3">
                    <button
                      onClick={() => setOpenMethod(isSelected ? null : method.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-3xl border-2 transition-all ${
                        isSelected ? "border-primary bg-primary/[0.03]" : "border-border hover:border-primary/20 bg-card"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${method.iconBg}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-foreground">{method.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {method.id === "mobile" && mobileNetworks.length > 0 ? mobileNetworks.join(", ") : method.sub}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? "border-primary bg-primary" : "border-border"
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                      </div>
                    </button>

                    {/* Method Specific Content */}
                    {isSelected && (
                      <div className="px-1 animate-in slide-in-from-top-2 duration-200">
                        {method.id === "mobile" && (
                          <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
                            <div className="relative">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block ml-1">Network Provider</label>
                              <button
                                onClick={() => setShowProviderDrop(!showProviderDrop)}
                                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 transition-all"
                              >
                                <span className="text-sm font-bold">{mmProvider || "Select Provider"}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showProviderDrop ? "rotate-180" : ""}`} />
                              </button>
                              {showProviderDrop && (
                                <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
                                  {mobileNetworks.map((net) => (
                                    <button
                                      key={net}
                                      onClick={() => { setMmProvider(net); setShowProviderDrop(false); }}
                                      className="w-full px-4 py-4 text-left text-sm font-bold hover:bg-muted border-b border-border last:border-0 flex items-center justify-between"
                                    >
                                      {net}
                                      {mmProvider === net && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block ml-1">Phone Number</label>
                              <div className="relative">
                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                  type="tel"
                                  value={mmPhone}
                                  onChange={(e) => setMmPhone(e.target.value)}
                                  placeholder="097..."
                                  className="w-full bg-muted/30 border border-border rounded-2xl px-11 py-3.5 text-sm font-bold outline-none focus:border-primary/40 transition-all"
                                />
                              </div>
                            </div>
                            <AmountSummaryBar amount={amount} fee={fee} currency={currency} />
                            <button
                              onClick={handleMobilePay}
                              disabled={!mmPhone || amount <= 0 || paymentStatus === "processing"}
                              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {paymentStatus === "processing" ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>Pay {currency} {total.toFixed(2)}</>
                              )}
                            </button>
                          </div>
                        )}

                        {method.id === "bank" && (
                          <div className="bg-card border border-border rounded-3xl p-5 space-y-5 shadow-sm">
                            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
                              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0" />
                              <p className="text-[11px] text-primary/80 leading-relaxed font-medium">
                                Please transfer the exact amount below to any of the accounts and upload your proof of payment.
                              </p>
                            </div>
                            <div className="space-y-3">
                              {bankProviders.length > 0 ? (
                                bankProviders.map((acc, idx) => (
                                  <div key={idx} className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{acc.name}</p>
                                        <p className="text-sm font-black mt-0.5">{acc.config?.accountNumber}</p>
                                        <p className="text-[11px] font-medium text-muted-foreground">{acc.config?.accountName}</p>
                                      </div>
                                      <CopyBtn text={acc.config?.accountNumber || ""} />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
                                  <p className="text-xs text-muted-foreground font-medium">No bank accounts configured.</p>
                                </div>
                              )}
                              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-bold text-primary uppercase">Payment Reference</p>
                                  <p className="text-sm font-black text-primary mt-0.5">{payRef}</p>
                                </div>
                                <CopyBtn text={payRef} />
                              </div>
                            </div>
                            <div
                              onClick={() => fileRef.current?.click()}
                              className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
                            >
                              <Upload className="w-6 h-6 text-muted-foreground" />
                              <p className="text-xs font-bold text-muted-foreground">{proofFile || "Upload Proof of Transfer"}</p>
                              <input
                                ref={fileRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => setProofFile(e.target.files?.[0]?.name || null)}
                              />
                            </div>
                            <AmountSummaryBar amount={amount} fee={fee} currency={currency} />
                            <button
                              disabled={amount <= 0}
                              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                            >
                              I've Made the Transfer
                            </button>
                          </div>
                        )}

                        {method.id === "whatsapp" && (
                          <div className="bg-card border border-border rounded-3xl p-5 space-y-5 shadow-sm">
                            <div className="flex flex-col items-center text-center gap-4 py-4">
                              <div className="w-16 h-16 rounded-3xl bg-green-500/10 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-500" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-lg">WhatsApp Pay</p>
                                <p className="text-xs text-muted-foreground font-medium px-4 leading-relaxed">
                                  Connect with our support team on WhatsApp to complete your payment securely.
                                </p>
                              </div>
                            </div>
                            <AmountSummaryBar amount={amount} fee={fee} currency={currency} />
                            <a
                              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello, I want to make a payment of ${currency} ${total.toFixed(2)} (Ref: ${payRef})`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full"
                            >
                              <button
                                disabled={amount <= 0}
                                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#22c35e] active:scale-95 transition-all disabled:opacity-50"
                              >
                                Continue to WhatsApp
                              </button>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-muted/20 border border-border rounded-3xl">
                <p className="text-sm text-muted-foreground font-medium">No payment methods currently available.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-6 space-y-4">
        <SecureFooter />
      </div>
    </div>
  );
}
