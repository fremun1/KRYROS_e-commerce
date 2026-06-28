import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ChevronLeft, Lock, ChevronDown, X,
  Smartphone, Check, Download, Info, AlertCircle
} from "lucide-react";
import { API_BASE, fetchSettings } from "@/lib/api";
import { useCurrencyStore } from "@/store/currencyStore";

const DEFAULT_METHODS = [
  { id: "mobile",   label: "Mobile",   sub: "MTN, Airtel, Zamtel", icon: "phone",     comingSoon: false },
  { id: "whatsapp", label: "WhatsApp", sub: "Pay on WhatsApp",     icon: "whatsapp",  comingSoon: false },
];

const ICON_BG: Record<string, string> = {
  phone:    "rgba(39, 185, 175, 0.12)",
  whatsapp: "rgba(37, 211, 102, 0.12)",
};

function MethodIconInner({ type }: { type: string }) {
  if (type === "phone") return <Smartphone className="w-6 h-6" style={{ color: "var(--kryros-primary)" }} />;
  if (type === "whatsapp") return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
  return null;
}

interface ReceiptData {
  recipientNumber: string; recipientName: string; operatorName: string;
  transactionId: string; dateTime: string; convenienceCharges: number;
  amount: number; currency: string; reference: string;
}

function ReceiptScreen({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
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
        <div className="bg-card rounded-3xl overflow-hidden shadow-xl border border-card-border">
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

export default function PayPage() {
  const [, params] = useRoute("/pay/:linkId");
  const [, navigate] = useLocation();
  const paymentLinkId = params?.linkId;
  const [step, setStep] = useState<1 | 2>(1);
  const { selected: selectedCurrency, currencies: allCurrencies, setCurrency: setGlobalCurrency } = useCurrencyStore();

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlAmount = urlParams.get("amount") || "";
  const urlCurrency = urlParams.get("currency")?.toUpperCase();
  const urlNote = urlParams.get("note") || "";
  const isLinkedPayment = !!paymentLinkId || !!urlAmount;
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
      return;
    }
    fetch(`${API_BASE}/api/pay-links/${paymentLinkId}`)
      .then(res => res.json())
      .then((link: any) => {
        if (!link?.isActive) { setLinkError("This payment link is no longer active."); return; }
        if (link?.expiresAt && new Date(link.expiresAt) < new Date()) { setLinkError("This payment link has expired."); return; }
        setLinkedPaymentName(link.name || "Payment Link");
        setLinkedExpiry(link.expiresAt || null);
        setRawAmount(String(link.amount || 0));
        setNote(link.note || "");
        if (allCurrencies.some(c => c.code === String(link.currency).toUpperCase())) setGlobalCurrency(link.currency.toUpperCase());
      })
      .catch(() => setLinkError("Unable to load payment link."))
      .finally(() => setLinkLoading(false));
  }, [paymentLinkId, allCurrencies, setGlobalCurrency]);

  const [rawAmount, setRawAmount] = useState(urlAmount);
  const [note, setNote] = useState(urlNote);
  const [receiptContact, setReceiptContact] = useState("");
  const [openMethod, setOpenMethod] = useState<string | null>(null);

  const amount = parseFloat(rawAmount) || 0;
  const feeRate = 0.03;
  const fee = Math.round(amount * feeRate * 100) / 100;
  const total = amount + fee;

  const currency = selectedCurrency.code;
  const CURRENCIES = allCurrencies;

  const [mmProvider, setMmProvider] = useState("MTN");
  const [mmPhone, setMmPhone] = useState("");
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("260969597029");

  useEffect(() => {
    fetchSettings().then((settings) => {
      const arr = Array.isArray(settings) ? settings : (settings as any)?.data || [];
      const wa = arr.find((s: any) => s.key === 'whatsapp_number')?.value;
      if (wa && wa.trim()) setWhatsappNumber(wa.replace(/[^0-9]/g, ""));
    }).catch(() => {});
  }, []);

  const handleMobilePay = async () => {
    if (payLoading || !mmPhone.trim()) return;
    setPayLoading(true); setPayError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payments/pay-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total, currency, phone: `260${mmPhone.replace(/^0/, "")}`,
          provider: mmProvider, note, contact: receiptContact
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Payment failed");
      setReceipt(data.receipt);
    } catch (err: any) { setPayError(err.message); }
    finally { setPayLoading(false); }
  };

  const handleWhatsAppPay = () => {
    const msg = encodeURIComponent(`*Payment Request*\nAmount: ${currency} ${total.toFixed(2)}\nRef: ${note || "None"}\nContact: ${receiptContact || "None"}`);
    window.open(`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${msg}`, "_blank");
  };

  if (receipt) return <ReceiptScreen receipt={receipt} onClose={() => setReceipt(null)} />;
  if (linkLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (linkError) return <div className="min-h-screen flex items-center justify-center text-red-500">{linkError}</div>;

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

        {step === 1 ? (
          <div className="px-4 py-4 space-y-4">
            <p className="text-sm font-bold text-foreground">Amount</p>
            <div className="flex h-[52px] rounded-xl bg-card border border-border overflow-hidden shadow-sm">
              <div className="min-w-[96px] flex items-center justify-center border-r border-border font-bold text-kryros-primary text-base gap-2">
                <select value={currency} onChange={(e) => setGlobalCurrency(e.target.value)} disabled={isLinkedPayment} className="bg-transparent font-bold outline-none">
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <ChevronDown className="w-4 h-4" />
              </div>
              <input value={rawAmount} onChange={(e) => !isLinkedPayment && setRawAmount(e.target.value.replace(/[^0-9.]/g, ""))} readOnly={isLinkedPayment} placeholder="0.00" className="flex-1 text-right px-3 font-extrabold text-2xl bg-transparent outline-none" />
            </div>
            {isLinkedPayment && <div className="rounded-xl px-3 py-2 text-sm border bg-primary/5 border-primary/20"><span className="font-bold">{linkedPaymentName}</span> · {currency} {rawAmount}</div>}
            <div>
              <p className="text-sm font-bold text-foreground mb-2">Reference (Optional)</p>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter reference" className="w-full h-[46px] rounded-xl border border-border px-3 bg-card text-sm outline-none" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">Receipt Contact (Optional)</p>
              <input value={receiptContact} onChange={(e) => setReceiptContact(e.target.value)} placeholder="Phone or Email" className="w-full h-[46px] rounded-xl border border-border px-3 bg-card text-sm outline-none" />
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-2">
              <div className="flex justify-between text-sm font-semibold text-muted-foreground"><span>Amount</span><span>{currency} {amount.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm font-semibold text-muted-foreground"><span>Fee (3%)</span><span>{currency} {fee.toFixed(2)}</span></div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-black text-foreground"><span>Total Payable</span><span className="text-lg text-primary">{currency} {total.toFixed(2)}</span></div>
            </div>
            <button onClick={() => amount > 0 && setStep(2)} disabled={amount <= 0} className="w-full h-[52px] rounded-xl bg-primary text-white font-extrabold text-base transition-all active:scale-95 disabled:opacity-50">Pay Now</button>
          </div>
        ) : (
          <div className="px-4 space-y-5">
            <div className="text-center pt-3">
              <p className="text-sm text-muted-foreground">You are sending</p>
              <p className="text-4xl font-black text-primary">{currency} {total.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_METHODS.map(m => (
                <button key={m.id} onClick={() => setOpenMethod(m.id)} className={`flex flex-col items-center py-5 rounded-2xl border bg-card transition-all ${openMethod === m.id ? "border-primary shadow-[0_0_0_1px_var(--kryros-primary)]" : "border-border"}`}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: ICON_BG[m.icon] }}><MethodIconInner type={m.icon} /></div>
                  <span className="text-xs font-semibold">{m.label}</span>
                </button>
              ))}
            </div>
            {payError && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{payError}</div>}
            {openMethod === "mobile" && (
              <div className="space-y-4 pt-2">
                <div className="relative">
                  <button onClick={() => setShowProviderDrop(!showProviderDrop)} className="w-full flex justify-between items-center px-4 h-[52px] rounded-xl border bg-card text-sm font-medium">{mmProvider}<ChevronDown className={`w-5 h-5 transition-transform ${showProviderDrop ? "rotate-180" : ""}`} /></button>
                  {showProviderDrop && (
                    <div className="absolute top-full w-full mt-1 border rounded-xl bg-card shadow-lg z-10">
                      {["MTN", "Airtel", "Zamtel"].map(p => <button key={p} onClick={() => { setMmProvider(p); setShowProviderDrop(false); }} className="w-full px-4 py-3 text-left text-sm hover:bg-muted">{p}</button>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="w-14 h-11 rounded-xl border bg-muted/40 flex items-center justify-center text-sm font-bold">+260</div>
                  <input value={mmPhone} onChange={(e) => setMmPhone(e.target.value)} placeholder="97XXXXXXX" type="tel" className="flex-1 px-4 rounded-xl border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <button onClick={handleMobilePay} disabled={payLoading || !mmPhone.trim()} className="w-full h-[52px] rounded-xl bg-primary text-white font-bold transition-all active:scale-95 disabled:opacity-50">{payLoading ? "Processing..." : `Pay ${currency} ${total.toFixed(2)}`}</button>
              </div>
            )}
            {openMethod === "whatsapp" && (
              <div className="pt-2">
                <button onClick={handleWhatsAppPay} className="w-full h-[52px] rounded-xl bg-[#25D366] text-white font-bold transition-all active:scale-95">Pay via WhatsApp</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
