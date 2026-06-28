import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { CheckCircle, Loader2, CreditCard, Calendar, Hash, Info, Lock, ChevronLeft, Download, AlertCircle, Clock, Smartphone, Building2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

const statusColors: Record<string, string> = {
  "PENDING": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "AWAITING_APPROVAL": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "PAID": "bg-green-500/10 text-green-600 border-green-500/20",
  "FAILED": "bg-red-500/10 text-red-600 border-red-500/20",
  "CANCELLED": "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusLabels: Record<string, string> = {
  "PENDING": "Pending",
  "AWAITING_APPROVAL": "Awaiting Approval",
  "PAID": "Paid",
  "FAILED": "Failed",
  "CANCELLED": "Cancelled",
};

export default function TrackPaymentPage() {
  const [, params] = useRoute("/track-payment/:paymentNumber");
  const paymentNumber = params?.paymentNumber;
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentNumber) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payments/direct-status/${paymentNumber}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Payment not found");
        setPayment(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Poll for status updates if pending
    const interval = setInterval(async () => {
      if (payment && (payment.status === "PAID" || payment.status === "FAILED" || payment.status === "CANCELLED")) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/payments/direct-status/${paymentNumber}`);
        if (res.ok) {
          const data = await res.json();
          setPayment(data);
        }
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [paymentNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-medium">Loading payment details...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Payment Not Found</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
          {error || "We couldn't find a payment with that reference number."}
        </p>
        <Link href="/pay">
          <button className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20">
            Go to Pay Page
          </button>
        </Link>
      </div>
    );
  }

  const status = payment.status?.toUpperCase() || "PENDING";
  const isPaid = status === "PAID";
  const isFailed = status === "FAILED";

  const getMethodIcon = (method: string) => {
    if (method?.toLowerCase().includes("mobile")) return <Smartphone className="w-4 h-4" />;
    if (method?.toLowerCase().includes("bank")) return <Building2 className="w-4 h-4" />;
    if (method?.toLowerCase().includes("whatsapp")) return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
    );
    return <CreditCard className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-5 py-4 flex items-center justify-between">
        <Link href="/pay">
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-base font-bold">Payment Tracking</h1>
        <div className="w-9" />
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-6">
        {/* Status Card */}
        <div className={`rounded-3xl p-6 text-center border ${statusColors[status] || "bg-muted border-border"}`}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-background shadow-sm">
            {isPaid ? (
              <CheckCircle className="w-10 h-10 text-green-500" />
            ) : isFailed ? (
              <AlertCircle className="w-10 h-10 text-red-500" />
            ) : (
              <Clock className="w-10 h-10 text-blue-500 animate-pulse" />
            )}
          </div>
          <h2 className="text-xl font-black mb-1">{statusLabels[status] || status}</h2>
          <p className="text-sm text-muted-foreground px-4">
            {isPaid 
              ? "Your payment has been successfully processed." 
              : isFailed 
                ? "The payment attempt was unsuccessful." 
                : "We are currently processing your payment. Please wait."}
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Payment Details
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">
              {payment.paymentNumber}
            </span>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" /> Reference
              </span>
              <span className="text-sm font-bold">{payment.paymentReference || payment.paymentNumber}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" /> Amount
              </span>
              <div className="text-right">
                <p className="text-lg font-black text-primary">
                  {payment.currency} {Number(payment.amount).toFixed(2)}
                </p>
                {payment.originalAmount && payment.originalCurrency && payment.originalCurrency !== payment.currency && (
                  <p className="text-[10px] text-muted-foreground">
                    Original: {payment.originalCurrency} {Number(payment.originalAmount).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                {getMethodIcon(payment.paymentMethod)} Method
              </span>
              <span className="text-sm font-bold capitalize">
                {payment.paymentMethod?.replace(/_/g, " ").toLowerCase() || "—"}
                {payment.networkName ? ` (${payment.networkName})` : ""}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Date
              </span>
              <span className="text-sm font-bold">
                {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>

            {payment.note && (
              <div className="pt-2 border-t border-border mt-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Note</span>
                <p className="text-xs text-foreground bg-muted/50 p-3 rounded-xl italic">
                  "{payment.note}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Receipt Action */}
        {isPaid && (
          <button 
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
            onClick={() => {
              // Trigger the same receipt download logic as PayPage if possible, 
              // or just link back to a receipt view
              window.print();
            }}
          >
            <Download className="w-4 h-4" /> Download Receipt
          </button>
        )}

        {/* Security Footer */}
        <div className="text-center space-y-2">
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" /> Secure · Encrypted · Safe
          </p>
          <p className="text-[10px] text-muted-foreground">
            If you have any issues, please contact KRYROS support with your reference number.
          </p>
        </div>
      </div>
    </div>
  );
}
