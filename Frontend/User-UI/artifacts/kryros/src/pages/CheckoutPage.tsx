import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { API_BASE } from "@/lib/api";
import {
  Check, CreditCard, Smartphone, Building2,
  Lock, ChevronLeft, ChevronRight, Truck, Zap, Clock,
  User, Mail, Phone, MapPin, Home, Globe, X, Upload, ChevronDown,
} from "lucide-react";


const SHIPPING_OPTIONS = [
  { id: "standard", label: "Standard Delivery", detail: "5–10 business days", price: 0, icon: Truck },
  { id: "express", label: "Express Delivery", detail: "2–3 business days", price: 15, icon: Zap },
  { id: "priority", label: "Priority Delivery", detail: "Next business day", price: 30, icon: Clock },
];

const DEFAULT_CHECKOUT_METHODS = [
  {
    id: "mobile",
    label: "Mobile Money",
    sub: "MTN, Airtel, Zamtel",
    icon: Smartphone,
    iconBg: "bg-primary/10",
  },
  {
    id: "card",
    label: "Card Payment",
    sub: "Visa, Mastercard & more",
    icon: CreditCard,
    iconBg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "bank",
    label: "Bank Transfer",
    sub: "Local & International",
    icon: Building2,
    iconBg: "bg-slate-50 dark:bg-slate-800",
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
  },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
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

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Address" },
  { id: 3, label: "Shipping" },
  { id: 4, label: "Payment" },
];

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const authUser = useAuthStore((s) => s.user);
  const authToken = useAuthStore((s) => s.token);
  const format = useCurrencyStore((s) => s.format);

  // Silent fire-and-forget: register customer phone for SMS marketing
  const registerPhoneForSms = (customerPhone: string, customerName: string) => {
    if (!customerPhone?.trim()) return;
    fetch(`${API_BASE}/api/notifications/sms/contacts/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customerPhone.trim(), name: customerName.trim() || undefined, source: 'Checkout' }),
    }).catch(() => {}); // silent — never block the checkout flow
  };

  // Fire payment receipt via SMS and/or email after successful order
  const sendReceiptAfterOrder = (orderRef: string, amountFormatted: string, method: string) => {
    const customerPhone = phone.trim();
    const customerEmail = email.trim();
    if (!customerPhone && !customerEmail) return;
    fetch(`${API_BASE}/api/notifications/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: customerPhone || undefined,
        email: customerEmail || undefined,
        orderRef,
        amount: amountFormatted,
        currency: selectedCurrency.symbol || selectedCurrency.code,
        customerName: `${firstName} ${lastName}`.trim() || 'Customer',
        paymentMethod: method,
        status: 'completed',
      }),
    }).catch(() => {}); // silent — never block the UI
  };


  const selectedCurrency = useCurrencyStore((s) => s.selected);
  const allCurrencies = useCurrencyStore((s) => s.currencies);

  const [step, setStep] = useState(1);
  // ── Dynamic payment config from admin panel ─────────────────────────────
  const [bankProviders, setBankProviders] = useState<{ name:string; config?:{ accountName?:string; accountNumber?:string } }[]>([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>(["MTN", "Airtel", "Zamtel", "M-Pesa"]);
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

        // Mobile money networks
        const mobileMethod = arr.find((m: any) => m.type === "mobile_wallet");
        if (mobileMethod?.providers?.length > 0) {
          const nets: string[] = mobileMethod.providers
            .filter((p: any) => p.isEnabled)
            .flatMap((p: any) =>
              (p.networks || [])
                .filter((n: any) => n.isEnabled)
                .map((n: any) => {
                  return n.name;
                })
            );
          if (nets.length > 0) setMobileNetworks(nets);
        }

        // Enabled method types in admin order
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type as string);
        
        // Ensure whatsapp is included if digital_wallet is enabled
        setApiMethodTypes(enabledTypes);
      })
      .catch(() => {});
  }, []);

  // Build active methods from API data, preserving existing icon/panel logic
  const TYPE_TO_ID: Record<string, string> = {
    mobile_wallet: "mobile", card: "card", bank: "bank",
    cash: "cod", digital_wallet: "whatsapp",
  };
  const activeCheckoutMethods = apiMethodTypes.length > 0
    ? (apiMethodTypes
        .map((t) => DEFAULT_CHECKOUT_METHODS.find((m) => m.id === (TYPE_TO_ID[t] ?? t)))
        .filter(Boolean) as typeof DEFAULT_CHECKOUT_METHODS)
    : DEFAULT_CHECKOUT_METHODS;
    
  // Force WhatsApp to be present if it's missing but we want it
  if (!activeCheckoutMethods.find(m => m.id === "whatsapp")) {
    const wa = DEFAULT_CHECKOUT_METHODS.find(m => m.id === "whatsapp");
    if (wa) activeCheckoutMethods.push(wa);
  }

  const [ordered, setOrdered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string>("");
  const [placedOrderId, setPlacedOrderId] = useState<string>("");
  const [mmPhase, setMmPhase] = useState<"idle" | "initializing" | "waiting" | "failed_init" | "timed_out">("idle");
  const [waMessage, setWaMessage] = useState<string>("");
  const [savedCartItems, setSavedCartItems] = useState<typeof cartItems>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "260969597029";

  const [firstName, setFirstName] = useState(authUser?.firstName ?? "");
  const [lastName, setLastName] = useState(authUser?.lastName ?? "");
  const [email, setEmail] = useState(authUser?.email ?? "");
  const [phone, setPhone] = useState("");

  const [country, setCountry] = useState("Zambia");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [shippingId, setShippingId] = useState("standard");
  const shippingPrice = SHIPPING_OPTIONS.find((s) => s.id === shippingId)?.price ?? 0;

  const SUBTOTAL = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const DISCOUNT = 0;
  const TAX = 0;
  const total = SUBTOTAL - DISCOUNT + TAX + shippingPrice;

  const [openMethod, setOpenMethod] = useState<string | null>(null);
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [mmProvider, setMmProvider] = useState("MTN Mobile Money");
  const [mmPhone, setMmPhone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);

  useEffect(() => {
    if (cartItems.length === 0 && !ordered && mmPhase === "idle") {
      navigate("/cart");
    }
  }, [cartItems.length, ordered, mmPhase, navigate]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const buildOrderPayload = (backendPaymentMethod: string, totalZMW: number) => ({
    items: cartItems.map((item) => ({ productId: item.id, quantity: item.qty })),
    paymentMethod: backendPaymentMethod,
    ...(openMethod === "mobile" && mmPhone ? { paymentPhone: mmPhone } : {}),
    totalZMW: Math.round(totalZMW * 100) / 100,
    currencyCode: selectedCurrency.code,
    currencySymbol: selectedCurrency.symbol,
    exchangeRate: selectedCurrency.exchangeRate,
    ...(openMethod === "mobile" && mmProvider ? { notes: `Mobile money provider: ${mmProvider}` } : {}),
    addressDetails: {
      email, firstName, lastName, phone,
      address: addressLine || `${city}, ${state}, ${country}`,
      zipCode: zipCode || undefined,
      countryName: country,
      stateName: state || undefined,
      cityName: city || undefined,
      manual: true,
    },
  });

  const startPolling = (orderId: string, orderNum: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    let attempts = 0;
    const MAX_ATTEMPTS = 36;

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setMmPhase("timed_out");
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/api/payments/status/${orderId}`, { headers });
        if (!r.ok) return;
        const d = await r.json().catch(() => null);
        if (!d) return;
        const status = d.status ?? d.paymentStatus ?? "";
        if (status === "PAID") {
          clearInterval(pollRef.current!);
          setPlacedOrderNumber(orderNum);
          clearCart();
          setOrdered(true);
      // Register phone number for SMS marketing (silent, non-blocking)
      registerPhoneForSms(phone, `${firstName} ${lastName}`);
          // Send receipt via SMS + email
          sendReceiptAfterOrder(orderNum, total.toFixed(2), `Mobile Money (${mmProvider})`);
          setMmPhase("idle");
        } else if (status === "FAILED") {
          clearInterval(pollRef.current!);
          setMmPhase("failed_init");
        }
      } catch {  }
    }, 5000);
  };

  const handleMobileMoneyPay = async () => {
    if (isSubmitting || !mmPhone.trim()) return;
    setIsSubmitting(true);
    setOrderError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const zmwRate = allCurrencies.find((c) => c.code === "ZMW")?.exchangeRate ?? 18.86;
      const totalZMW = total * zmwRate;

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(buildOrderPayload("MOBILE_MONEY", totalZMW)),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Failed to place order.";
        setOrderError(msg);
        setIsSubmitting(false);
        return;
      }

      const orderId = data.id ?? "";
      const orderNum = data.orderNumber ?? data.id ?? "";
      setPlacedOrderId(orderId);
      setSavedCartItems([...cartItems]);
      setMmPhase("initializing");
      setOpenMethod(null);

      try {
        const initRes = await fetch(`${API_BASE}/api/payments/initialize`, {
          method: "POST",
          headers,
          body: JSON.stringify({ orderId, phone: mmPhone, amount: Math.round(totalZMW * 100) / 100 }),
        });
        if (!initRes.ok) {
          setMmPhase("failed_init");
          setIsSubmitting(false);
          return;
        }
        setMmPhase("waiting");
        startPolling(orderId, orderNum);
      } catch {
        setMmPhase("failed_init");
      }
    } catch {
      setOrderError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting || cartItems.length === 0) return;
    setIsSubmitting(true);
    setOrderError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const PAYMENT_METHOD_MAP: Record<string, string> = {
        card: "CARD", bank: "BANK_TRANSFER", whatsapp: "WHATSAPP",
        apple: "CARD", google: "CARD", crypto: "CARD",
      };
      const backendPaymentMethod = PAYMENT_METHOD_MAP[openMethod ?? "card"] ?? "CARD";
      const zmwRate = allCurrencies.find((c) => c.code === "ZMW")?.exchangeRate ?? 18.86;
      const totalZMW = total * zmwRate;

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(buildOrderPayload(backendPaymentMethod, totalZMW)),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Failed to place order.";
        setOrderError(msg);
        setIsSubmitting(false);
        return;
      }

      const orderNum = data.orderNumber ?? data.id ?? "";
      setPlacedOrderNumber(orderNum);
      setPlacedOrderId(data.id ?? "");
      setSavedCartItems([...cartItems]);

      if (openMethod === "whatsapp") {
        const itemsList = cartItems.map((i) => `• ${i.qty}× ${i.name}`).join("\n");
        const msg = `*New Order: ${orderNum}*\n\n*Customer:*\n${firstName} ${lastName}\n${phone}\n\n*Items:*\n${itemsList}\n\n*Total:* ${format(total)}\n\n*Payment Method:* WhatsApp Transfer\nPlease confirm my payment. Thank you!`;
        setWaMessage(msg);
        setOrdered(true);
        clearCart();
        // Register phone number for SMS marketing (silent, non-blocking)
        registerPhoneForSms(phone, `${firstName} ${lastName}`);
        // Send receipt via SMS + email
        sendReceiptAfterOrder(orderNum, total.toFixed(2), "WhatsApp Payment");
        // Auto-redirect to WhatsApp for better UX
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
      } else {
        setOrdered(true);
        clearCart();
        // Register phone number for SMS marketing (silent, non-blocking)
        registerPhoneForSms(phone, `${firstName} ${lastName}`);
        // Send receipt via SMS + email
        sendReceiptAfterOrder(orderNum, total.toFixed(2), openMethod === "bank" ? "Bank Transfer" : "Card Payment");
      }
    } catch {
      setOrderError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank");
  };

  if (ordered) {
    const isManual = openMethod === "bank" || openMethod === "whatsapp";
    return (
      <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col px-6 pt-12 pb-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Check className="w-10 h-10 text-primary" strokeWidth={3} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">Order Placed!</h1>
            <p className="text-sm text-muted-foreground">Order Number: <span className="font-bold text-foreground">#{placedOrderNumber}</span></p>
          </div>
          <div className="w-full bg-card border border-border rounded-3xl p-5 space-y-4">
            <div className="space-y-3">
              {savedCartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.qty}× {item.name}</span>
                  <span className="font-semibold">{format(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-border flex justify-between font-black">
                <span>Total Paid</span>
                <span className="text-primary">{format(total)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 w-full">
            <p className="text-sm text-muted-foreground px-4">
              {isManual ? "We'll confirm your order once we verify your payment." : `Thank you${firstName ? `, ${firstName}` : ""}! Your order is confirmed.`}
            </p>
            {isManual && (
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 text-xs text-primary font-medium">
                {openMethod === "whatsapp" ? "Our team will contact you on WhatsApp to confirm your payment." : "Send your proof of transfer to support. Once confirmed, your order will be processed."}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {openMethod === "whatsapp" && (
            <button onClick={handleWhatsAppRedirect}
              className="w-full py-4 bg-[var(--kryros-primary-hover)] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Confirm on WhatsApp
            </button>
          )}
          <button onClick={() => navigate("/shop")}
            className="w-full py-4 bg-foreground text-background rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (mmPhase !== "idle") {
    return (
      <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col px-6 pt-12 pb-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          {mmPhase === "initializing" || mmPhase === "waiting" ? (
            <>
              <div className="relative">
                <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-black text-foreground">
                  {mmPhase === "initializing" ? "Initializing Payment…" : "Waiting for Approval"}
                </h1>
                <p className="text-sm text-muted-foreground px-6 leading-relaxed">
                  {mmPhase === "initializing"
                    ? "Sending payment request to your phone…"
                    : `A payment prompt has been sent to ${mmPhone}. Please open your ${mmProvider} app and approve the payment.`}
                </p>
              </div>
              <div className="w-full bg-primary/5 border border-primary/15 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Amount</span>
                  <span className="font-bold text-foreground">{format(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-bold text-foreground">{mmPhone}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                <X className="w-10 h-10 text-destructive" strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-foreground">Payment Failed</h1>
                <p className="text-sm text-muted-foreground px-6">
                  {mmPhase === "timed_out"
                    ? "The payment request timed out. Please try again."
                    : "The payment could not be processed. Please check your phone number and try again."}
                </p>
              </div>
              <button onClick={() => { setMmPhase("idle"); setOpenMethod("mobile"); }}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all">
                Try Again
              </button>
            </>
          )}
        </div>
        {(mmPhase === "initializing" || mmPhase === "waiting") && (
          <button onClick={() => { setMmPhase("idle"); if (pollRef.current) clearInterval(pollRef.current); }}
            className="w-full py-4 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            Cancel and try another method
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-background min-h-screen pb-10">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-xl z-40 px-4 py-4 flex items-center gap-4 border-b border-border">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate("/cart")}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-black text-foreground">Checkout</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {step} of 4</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step >= s.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <span className={`text-[10px] font-bold ${step >= s.id ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </div>

      <div className="px-4 mt-2">
        {/* ── STEP 1: PERSONAL DETAILS ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">First Name</label>
                <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">Last Name</label>
                <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">Email Address</label>
              <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" type="email" className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">Phone Number</label>
              <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+260 XXX XXXXXX" type="tel" className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium" />
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!firstName || !lastName || !email || !phone}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm mt-4 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              Continue to Address
            </button>
          </div>
        )}

        {/* ── STEP 2: ADDRESS ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">Country</label>
              <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium">
                  <option>Zambia</option><option>South Africa</option><option>Zimbabwe</option>
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">City</label>
                <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lusaka" className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">State/Province</label>
                <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Lusaka Province" className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase">Street Address</label>
              <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3.5 bg-card focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                <Home className="w-4 h-4 text-muted-foreground" />
                <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="House No, Street Name" className="flex-1 text-sm bg-transparent outline-none text-foreground font-medium" />
              </div>
            </div>
            <button onClick={() => setStep(3)} disabled={!city || !addressLine}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm mt-4 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              Continue to Shipping
            </button>
          </div>
        )}

        {/* ── STEP 3: SHIPPING ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-foreground mb-1">Select delivery method</p>
            <div className="space-y-3">
              {SHIPPING_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setShippingId(opt.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all text-left
                    ${shippingId === opt.id ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "border-border bg-card hover:border-primary/30"}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${shippingId === opt.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">{opt.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{opt.price === 0 ? "FREE" : format(opt.price)}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(4)}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm mt-4 hover:bg-primary/90 active:scale-95 transition-all">
              Continue to Payment
            </button>
          </div>
        )}

        {/* ── STEP 4: PAYMENT ── */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Amount summary — exactly like PayPage step 2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">You are paying</span>
                <button onClick={() => setStep(3)} className="text-xs text-primary font-semibold hover:underline">Change</button>
              </div>
              <p className="text-3xl font-black text-foreground">{format(total)}</p>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">{format(SUBTOTAL)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold text-foreground">{shippingPrice === 0 ? "Free" : format(shippingPrice)}</span>
                </div>
              </div>
            </div>

            {/* Method list — identical to PayPage */}
            <div>
              <p className="text-sm font-bold text-foreground mb-3">Choose payment method</p>
              <div className="space-y-2">
                {activeCheckoutMethods.map((m) => {
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

            <button onClick={() => setStep(3)} className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors py-2">
              ← Back to Shipping
            </button>
          </div>
        )}
      </div>
    </div>

    {/* ══════════════════════════════════════════
        PAYMENT METHOD BOTTOM SHEET
        Placed OUTSIDE the scroll container — same as PayPage
    ══════════════════════════════════════════ */}
    {openMethod && step === 4 && (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpenMethod(null)} />
        <div className="relative bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="px-5 pb-8 space-y-4">

            {/* Sheet header */}
            <div className="flex items-center justify-between pt-1 pb-2">
              {(() => {
                const m = activeCheckoutMethods.find((x) => x.id === openMethod);
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
              <button onClick={() => setOpenMethod(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* ── MOBILE MONEY — PayPage style with dropdown ── */}
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
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProviderDrop ? "rotate-180" : ""}`} />
                  </button>
                  {showProviderDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-10 border border-border rounded-2xl bg-card shadow-lg overflow-hidden">
                      {mobileNetworks.map((net) => (
                        <button
                          key={net}
                          type="button"
                          onClick={() => { setMmProvider(net); setShowProviderDrop(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-muted transition-colors ${mmProvider === net ? "bg-primary/5 font-bold text-primary" : "text-foreground"}`}
                        >
                          {net}
                          {mmProvider === net && <span className="ml-auto text-primary text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Mobile Money Number</label>
                  <div className="flex items-center gap-2.5 border border-border rounded-2xl px-3.5 py-3 bg-background focus-within:ring-2 focus-within:ring-primary/30">
                    <Smartphone className="w-5 h-5 text-primary flex-shrink-0" />
                    <input
                      value={mmPhone}
                      onChange={(e) => setMmPhone(e.target.value)}
                      placeholder="e.g. 0971 234567"
                      type="tel"
                      inputMode="tel"
                      className="flex-1 text-sm font-semibold text-foreground outline-none bg-transparent"
                    />
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">A payment prompt will be sent to your <strong>{mmProvider}</strong> number. Approve it on your phone to complete payment.</p>
                </div>
                <div className="border-t border-border pt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">{format(SUBTOTAL)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold text-foreground">{shippingPrice === 0 ? "Free" : format(shippingPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-black pt-2 border-t border-border">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">{format(total)}</span>
                  </div>
                </div>
                {orderError && <p className="text-xs text-destructive text-center font-semibold">{orderError}</p>}
                <button
                  onClick={handleMobileMoneyPay}
                  disabled={isSubmitting || !mmPhone.trim()}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Smartphone className="w-4 h-4" />}
                  {isSubmitting ? "Processing…" : `Send Payment Prompt — ${format(total)}`}
                </button>
                <SecureFooter />
              </div>
            )}

            {/* ── CARD PAYMENT ── */}
            {openMethod === "card" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Card Number</label>
                  <div className="flex items-center gap-2 border border-border rounded-2xl px-3.5 py-3 bg-background focus-within:ring-2 focus-within:ring-primary/30">
                    <input value={cardNum} onChange={(e) => setCardNum(e.target.value)}
                      placeholder="1234 5678 9012 3456" inputMode="numeric"
                      className="flex-1 text-sm text-foreground outline-none bg-transparent" />
                    <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Expiry Date</label>
                    <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM / YY"
                      className="w-full border border-border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">CVV</label>
                    <input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" type="password"
                      className="w-full border border-border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Cardholder Name</label>
                  <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="John Doe"
                    className="w-full border border-border rounded-2xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-semibold text-foreground">Save card for future payments</span>
                  <button onClick={() => setSaveCard(!saveCard)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${saveCard ? "bg-primary" : "bg-muted"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${saveCard ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="border-t border-border pt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{format(SUBTOTAL)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">{shippingPrice === 0 ? "Free" : format(shippingPrice)}</span></div>
                  <div className="flex items-center justify-between text-sm font-black pt-2 border-t border-border"><span>Total</span><span className="text-primary">{format(total)}</span></div>
                </div>
                {orderError && <p className="text-xs text-destructive text-center font-semibold">{orderError}</p>}
                <button onClick={handlePlaceOrder} disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
                  {isSubmitting ? "Placing Order…" : `Pay ${format(total)}`}
                </button>
                <p className="text-[10px] text-center text-muted-foreground">
                  By placing your order, you agree to our <Link href="/terms"><span className="text-primary underline cursor-pointer">Terms</span></Link>
                </p>
                <SecureFooter />
              </div>
            )}

            {/* ── BANK TRANSFER ── */}
            {openMethod === "bank" && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3 flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-muted-foreground">Transfer the exact amount below and use your order number as the payment reference.</p>
                </div>
                <div className="space-y-3">
                  {(bankProviders.length > 0
                    ? bankProviders.flatMap((acc) => [
                        { label: "Bank Name",      val: acc.name },
                        { label: "Account Name",   val: acc.config?.accountName   || "" },
                        { label: "Account Number", val: acc.config?.accountNumber || "" },
                      ])
                    : [
                        { label: "Bank Name",      val: "Stanbic Bank Zambia" },
                        { label: "Account Name",   val: "KRYROS LIMITED" },
                        { label: "Account Number", val: "91200012345667" },
                      ]
                  ).map(({ label, val }) => (
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
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">Upload Payment Proof</p>
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    {proofFile
                      ? <><Check className="w-8 h-8 text-primary" /><p className="text-xs font-bold text-foreground">File Selected</p></>
                      : <><Upload className="w-8 h-8 text-muted-foreground" /><p className="text-xs font-bold text-muted-foreground">Tap to upload proof</p></>
                    }
                  </button>
                  <input type="file" ref={fileRef} className="hidden" onChange={(e) => setProofFile(e.target.files?.[0]?.name || null)} />
                </div>
                <div className="border-t border-border pt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{format(SUBTOTAL)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">{shippingPrice === 0 ? "Free" : format(shippingPrice)}</span></div>
                  <div className="flex items-center justify-between text-sm font-black pt-2 border-t border-border"><span>Total Payable</span><span className="text-primary">{format(total)}</span></div>
                </div>
                {orderError && <p className="text-xs text-destructive text-center font-semibold">{orderError}</p>}
                <button onClick={handlePlaceOrder} disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  {isSubmitting ? "Placing Order…" : "I Have Made the Transfer"}
                </button>
                <SecureFooter />
              </div>
            )}

            {/* ── WHATSAPP PAYMENT ── */}
            {openMethod === "whatsapp" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-9 h-9" fill="currentColor" style={{ color: "var(--kryros-primary-hover)" }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <p className="text-sm text-center text-muted-foreground px-4">
                    You will be redirected to WhatsApp to complete your payment securely.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{format(SUBTOTAL)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">{shippingPrice === 0 ? "Free" : format(shippingPrice)}</span></div>
                  <div className="flex items-center justify-between text-sm font-black pt-2 border-t border-border"><span>Total to Pay</span><span className="text-primary">{format(total)}</span></div>
                </div>
                {orderError && <p className="text-xs text-destructive text-center font-semibold">{orderError}</p>}
                <button onClick={handlePlaceOrder} disabled={isSubmitting}
                  className="w-full py-4 bg-[var(--kryros-primary-hover)] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  }
                  {isSubmitting ? "Processing…" : "Continue on WhatsApp"}
                </button>
                <SecureFooter />
              </div>
            )}

          </div>
        </div>
      </div>
    )}
  );
}
