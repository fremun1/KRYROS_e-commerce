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
    sub: "",
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

  // ── Read URL query params ──
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlAmount = urlParams.get("amount") || "";
  const urlCurrency = urlParams.get("currency") || "ZMW";
  const urlNote = urlParams.get("note") || "";
  
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

        // Mobile money networks
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

        // Store enabled method types
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type as string);
        setApiMethodTypes(enabledTypes);
        setIsConfigLoaded(true);
      })
      .catch(() => {
        setIsConfigLoaded(true);
      });
  }, []);

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

  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const handlePay = async () => {
    if (paymentStatus === "processing") return;
    setPaymentStatus("processing");
    
    try {
      // Simulate API call for payment
      await new Promise(r => setTimeout(r, 2000));
      
      const newReceipt: ReceiptData = {
        recipientNumber: "260969597029",
        recipientName: "KRYROS MOBILE TECH LIMITED",
        operatorName: mmProvider || "Card Payment",
        transactionId: "TX-" + Math.random().toString(36).toUpperCase().slice(-10),
        dateTime: new Date().toLocaleString(),
        convenienceCharges: fee,
        amount: total,
        currency: currency,
        reference: payRef,
      };
      
      setReceipt(newReceipt);
      setPaymentStatus("success");
    } catch (err) {
      setPaymentStatus("error");
    }
  };

  if (receipt) {
    return <ReceiptScreen receipt={receipt} onClose={() => setReceipt(null)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto shadow-2xl">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <Link href="/">
          <button className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-bold text-foreground">Payment Details</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-6 py-4 space-y-6 overflow-y-auto">
        {/* Amount Input */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount to Pay</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-border">
              <button onClick={() => setShowCurrencyDrop(!showCurrencyDrop)} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                <span className="text-sm font-bold text-foreground">{currencyObj.flag} {currencyObj.code}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showCurrencyDrop ? "rotate-180" : ""}`} />
              </button>
            </div>
            <input
              type="number"
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-32 pr-4 py-5 bg-card border border-border rounded-3xl text-2xl font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
            />
            {showCurrencyDrop && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                {CURRENCIES.map((c) => (
                  <button key={c.code} onClick={() => { setCurrency(c.code); setShowCurrencyDrop(false); }} className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-muted transition-colors ${currency === c.code ? "bg-primary/5 text-primary font-bold" : "text-foreground"}`}>
                    <span className="text-sm">{c.flag} {c.label}</span>
                    {currency === c.code && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <AmountSummaryBar amount={amount} fee={fee} currency={currency} />
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Payment Method</label>
            <span className="text-[10px] text-muted-foreground font-medium">Secured by Kryros Pay</span>
          </div>

          <div className="space-y-3">
            {activeMethods.length > 0 ? (
              activeMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = openMethod === method.id;
                return (
                  <div key={method.id} className="space-y-2">
                    <button
                      onClick={() => setOpenMethod(isSelected ? null : method.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all text-left ${isSelected ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-border bg-card hover:border-primary/50"}`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${method.iconBg}`}>
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{method.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {method.id === "mobile" ? (mobileNetworks.length > 0 ? mobileNetworks.join(", ") : "Select network") : method.sub}
                        </p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? "rotate-180" : ""}`} />
                    </button>

                    {isSelected && (
                      <div className="p-5 rounded-3xl bg-muted/30 border border-border/50 space-y-5 animate-in slide-in-from-top-2 duration-200">
                        {method.id === "mobile" && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Network Operator</label>
                              <div className="grid grid-cols-2 gap-2">
                                {mobileNetworks.map((net) => (
                                  <button key={net} onClick={() => setMmProvider(net)} className={`py-3 rounded-2xl border text-xs font-bold transition-all ${mmProvider === net ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
                                    {net}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</label>
                              <div className="relative">
                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                  type="tel"
                                  value={mmPhone}
                                  onChange={(e) => setMmPhone(e.target.value)}
                                  placeholder="09XXXXXXXX"
                                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-border bg-background text-sm font-semibold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {method.id === "bank" && (
                          <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                              <div className="flex items-center gap-2 text-blue-600">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Instructions</span>
                              </div>
                              <p className="text-xs text-blue-800 leading-relaxed">Please transfer exactly <span className="font-bold">{currency} {total.toFixed(2)}</span> to any of the accounts below and upload the transfer receipt.</p>
                            </div>
                            
                            {bankProviders.map((bank, i) => (
                              <div key={i} className="p-4 rounded-2xl bg-background border border-border space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-foreground">{bank.name}</span>
                                  <div className="px-2 py-0.5 rounded-md bg-muted text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Bank Account</div>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">Account Name</span>
                                    <span className="text-[11px] font-semibold text-foreground">{bank.config?.accountName}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">Account Number</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono font-bold text-foreground tracking-wider">{bank.config?.accountNumber}</span>
                                      <CopyBtn text={bank.config?.accountNumber || ""} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            <button onClick={() => fileRef.current?.click()} className="w-full py-5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/[0.02] transition-all">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Upload className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-bold text-foreground">{proofFile ? "File selected" : "Upload Transfer Proof"}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{proofFile || "PNG, JPG or PDF up to 5MB"}</p>
                              </div>
                            </button>
                            <input type="file" ref={fileRef} className="hidden" onChange={(e) => setProofFile(e.target.files?.[0]?.name || null)} />
                          </div>
                        )}

                        {method.id === "whatsapp" && (
                          <div className="p-4 rounded-2xl bg-green-50/50 border border-green-100 space-y-2 text-center">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                              <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-600" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </div>
                            <p className="text-xs text-green-800 leading-relaxed">Our team will guide you through the payment process on WhatsApp.</p>
                          </div>
                        )}

                        <button
                          onClick={handlePay}
                          disabled={paymentStatus === "processing"}
                          className="w-full py-4.5 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {paymentStatus === "processing" ? "Processing..." : `Pay ${currency} ${total.toFixed(2)}`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed border-border">
                <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">No payment methods enabled</p>
                <p className="text-xs mt-1">Please check back later or contact support.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-background/80 backdrop-blur-sm">
        <SecureFooter />
      </div>
    </div>
  );
}
