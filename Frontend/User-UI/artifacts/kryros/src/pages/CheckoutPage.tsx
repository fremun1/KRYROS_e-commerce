import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { API_BASE, fetchShippingMethods, type ApiShippingMethod } from "@/lib/api";
import { toast } from "sonner";
import {
  Check,
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Truck,
  Zap,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Globe,
  X,
  Upload,
  ChevronDown,
  Search,
} from "lucide-react";

// ── Country dial codes (for phone picker only) ────────────────────────────────
const DIAL_COUNTRIES = [
  { name: "Zambia",       code: "ZM", dial: "+260" },
  { name: "Zimbabwe",     code: "ZW", dial: "+263" },
  { name: "South Africa", code: "ZA", dial: "+27"  },
  { name: "Kenya",        code: "KE", dial: "+254" },
  { name: "Nigeria",      code: "NG", dial: "+234" },
  { name: "Ghana",        code: "GH", dial: "+233" },
  { name: "Tanzania",     code: "TZ", dial: "+255" },
  { name: "Uganda",       code: "UG", dial: "+256" },
  { name: "Malawi",       code: "MW", dial: "+265" },
  { name: "Mozambique",   code: "MZ", dial: "+258" },
  { name: "Botswana",     code: "BW", dial: "+267" },
  { name: "Namibia",      code: "NA", dial: "+264" },
  { name: "Rwanda",       code: "RW", dial: "+250" },
  { name: "Ethiopia",     code: "ET", dial: "+251" },
  { name: "DR Congo",     code: "CD", dial: "+243" },
  { name: "Cameroon",     code: "CM", dial: "+237" },
  { name: "Senegal",      code: "SN", dial: "+221" },
  { name: "Ivory Coast",  code: "CI", dial: "+225" },
  { name: "Angola",       code: "AO", dial: "+244" },
  { name: "United Kingdom", code: "GB", dial: "+44" },
  { name: "United States", code: "US", dial: "+1"  },
  { name: "Canada",       code: "CA", dial: "+1"   },
  { name: "Germany",      code: "DE", dial: "+49"  },
  { name: "France",       code: "FR", dial: "+33"  },
  { name: "China",        code: "CN", dial: "+86"  },
  { name: "India",        code: "IN", dial: "+91"  },
  { name: "Australia",    code: "AU", dial: "+61"  },
  { name: "UAE",          code: "AE", dial: "+971" },
];

const DEFAULT_CHECKOUT_METHODS = [
  { id: "mobile",   label: "Mobile Money",   sub: "", icon: Smartphone, iconBg: "bg-primary/10" },
  { id: "card",     label: "Card Payment",   sub: "Visa, Mastercard & more",   icon: CreditCard, iconBg: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "bank",     label: "Bank Transfer",  sub: "Local & International",     icon: Building2,  iconBg: "bg-slate-50 dark:bg-slate-800" },
  {
    id: "whatsapp", label: "WhatsApp Payment", sub: "Pay securely on WhatsApp",
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.788-1.653-2.086-.173-.298-.018-.459.13-.608.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.208-.242-.58-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.413.248-.695.248-1.291.173-1.413-.074-.123-.272-.198-.57-.347M11.886 3.004h.009c2.62 0 5.077 1.02 6.928 2.872 1.845 1.851 2.861 4.304 2.859 6.92-.004 5.394-4.394 9.78-9.79 9.78-1.676-.003-3.32-.428-4.78-1.236L3 21l.664-3.872a9.76 9.76 0 01-1.32-4.86c.003-5.39 4.394-9.78 9.78-9.78m0-2.004C5.322.999.5 5.82.498 12.135c0 2.19.576 4.326 1.668 6.2L.057 24l5.792-2.078a11.87 11.87 0 006.04 1.63h.005c6.313 0 11.44-5.128 11.445-11.438.003-3.06-1.187-5.94-3.346-8.104A11.43 11.43 0 0011.886.999z" />
      </svg>
    ),
    iconBg: "bg-green-50 dark:bg-green-900/20",
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
      className="text-xs text-primary font-semibold border border-primary/40 px-3 py-1 rounded-lg hover:bg-primary/5 transition-colors flex-shrink-0"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SecureFooter() {
  return (
    <div className="flex items-center justify-between pt-4 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Lock className="w-3 h-3" />
        <span>Secure checkout powered by Kryros</span>
      </div>
      <div className="flex -space-x-1.5">
        <div className="w-5 h-3 rounded-[4px] bg-gradient-to-r from-blue-500 to-blue-700" />
        <div className="w-5 h-3 rounded-[4px] bg-gradient-to-r from-slate-200 to-slate-400 dark:from-slate-600 dark:to-slate-800" />
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const cartItems    = useCartStore((s) => s.items);
  const clearCart    = useCartStore((s) => s.clearCart);
  const authUser     = useAuthStore((s) => s.user);
  const authToken    = useAuthStore((s) => s.token);
  const format       = useCurrencyStore((s) => s.format);
  const selectedCurrency = useCurrencyStore((s) => s.selected);
  const allCurrencies    = useCurrencyStore((s) => s.currencies);

  // ── Dynamic countries from admin panel ──────────────────────────────────────
  type ShippingCountry = { name: string; code: string; shippingEnabled: boolean; isActive: boolean };
  const [shippingCountries, setShippingCountries] = useState<ShippingCountry[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/countries`)
      .then((r) => r.json())
      .then((data: any) => {
        const raw: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const mapped = raw.map((c: any) => ({
          name: c.name || '',
          code: c.code || '',
          shippingEnabled: c.shippingEnabled !== false,
          isActive: c.isActive !== false && c.status !== false,
        }));
        setShippingCountries(mapped);
        // Auto-select the default country if we have one
        const defaultCountry = mapped.find((c) => c.isActive && c.shippingEnabled);
        if (defaultCountry && !country) setCountry(defaultCountry.name);
      })
      .catch(() => {
        setShippingCountries([]);
      });
  }, []);

  // ── Dynamic shipping methods from admin panel ────────────────────────────────
  const [shippingMethods,   setShippingMethods]   = useState<ApiShippingMethod[]>([]);
  const [shippingLoading,   setShippingLoading]   = useState(true);
  const [shippingId,        setShippingId]        = useState("");

  useEffect(() => {
    setShippingLoading(true);
    fetchShippingMethods()
      .then((methods) => {
        setShippingMethods(methods);
        if (methods.length > 0) {
          setShippingId(methods[0].id);
        }
      })
      .catch(() => {
        setShippingMethods([]);
      })
      .finally(() => setShippingLoading(false));
  }, []);

  // ── Dynamic payment config from admin panel ─────────────────────────────────
  const [bankProviders, setBankProviders]   = useState<{ name: string; config?: { accountName?: string; accountNumber?: string } }[]>([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>([]);
  const [apiMethodTypes, setApiMethodTypes] = useState<string[]>([]);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-config/public`)
      .then((r) => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : data?.data ?? [];
        
        // Bank providers
        const bankMethod = arr.find((m: any) => m.type === "bank");
        if (bankMethod?.providers) {
          setBankProviders(bankMethod.providers.filter((p: any) => p.isEnabled));
        }

        // Mobile networks
        const mobileMethod = arr.find((m: any) => m.type === "mobile_wallet");
        if (mobileMethod?.providers?.length > 0) {
          const nets: string[] = mobileMethod.providers
            .filter((p: any) => p.isEnabled)
            .flatMap((p: any) =>
              (p.networks || [])
                .filter((n: any) => n.isEnabled)
                .map((n: any) => (n.name as string).replace(/\s*Mobile\s*Money\s*/i, "").trim()),
            );
          setMobileNetworks(nets);
          if (nets.length > 0) setMmProvider(nets[0]);
        }

        // Active types
        const enabledTypes = arr.filter((m: any) => m.isEnabled).map((m: any) => m.type as string);
        setApiMethodTypes(enabledTypes);
        setIsConfigLoaded(true);
      })
      .catch(() => {
        setIsConfigLoaded(true);
      });
  }, []);

  const TYPE_TO_ID: Record<string, string> = {
    mobile_wallet: "mobile", card: "card", bank: "bank", cash: "cod", digital_wallet: "whatsapp", whatsapp: "whatsapp",
  };
  
  const activeCheckoutMethods = isConfigLoaded 
    ? apiMethodTypes
        .map((t) => DEFAULT_CHECKOUT_METHODS.find((m) => m.id === (TYPE_TO_ID[t] ?? t)))
        .filter(Boolean) as typeof DEFAULT_CHECKOUT_METHODS
    : [];

  // ── Helpers: register phone + send receipt ──────────────────────────────────
  const registerPhoneForSms = (customerPhone: string, customerName: string) => {
    if (!customerPhone?.trim()) return;
    fetch(`${API_BASE}/api/notifications/sms/contacts/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: customerPhone.trim(), name: customerName.trim() || undefined, source: "Checkout" }),
    }).catch(() => {});
  };

  const sendReceiptAfterOrder = (orderRef: string, amountFormatted: string, method: string) => {
    const customerPhone = phone.trim();
    const customerEmail = email.trim();
    if (!customerPhone && !customerEmail) return;
    fetch(`${API_BASE}/api/notifications/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: customerPhone || undefined, email: customerEmail || undefined,
        orderRef, amount: amountFormatted,
        currency: selectedCurrency.symbol || selectedCurrency.code,
        customerName: `${firstName} ${lastName}`.trim() || "Customer",
        paymentMethod: method, status: "completed",
      }),
    }).catch(() => {});
  };

  // ── State ───────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [ordered,          setOrdered]          = useState(false);
  const [isSubmitting,     setIsSubmitting]      = useState(false);
  const [orderError,       setOrderError]        = useState<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string>("");
  const [placedOrderId,    setPlacedOrderId]     = useState<string>("");
  const [mmPhase, setMmPhase] = useState<"idle" | "initializing" | "waiting" | "failed_init" | "timed_out">("idle");
  const [waMessage,        setWaMessage]         = useState<string>("");
  const [savedCartItems,   setSavedCartItems]    = useState<typeof cartItems>([]);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "260969597029";

  // Contact
  const [firstName,     setFirstName]     = useState(authUser?.firstName ?? "");
  const [lastName,      setLastName]      = useState(authUser?.lastName ?? "");
  const [email,         setEmail]         = useState(authUser?.email ?? "");
  const [phone,         setPhone]         = useState("");
  const [orderNotes,    setOrderNotes]    = useState("");
  const [phoneCountry,  setPhoneCountry]  = useState(DIAL_COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Address
  const [country,      setCountry]     = useState("");
  const [state,        setState]       = useState("");
  const [city,         setCity]        = useState("");
  const [addressLine,  setAddressLine] = useState("");
  const [zipCode,      setZipCode]     = useState("");

  // Shipping & payment
  const shippingPrice = shippingMethods.find((s) => s.id === shippingId) ? Number(shippingMethods.find((s) => s.id === shippingId)!.fee) : 0;
  const SUBTOTAL = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const DISCOUNT = 0;
  const FEE_RATE = 0.01; // 1% processing fee
  const PROCESSING_FEE = Math.round((SUBTOTAL - DISCOUNT + shippingPrice) * FEE_RATE * 100) / 100;
  const total = SUBTOTAL - DISCOUNT + PROCESSING_FEE + shippingPrice;

  const [openMethod,       setOpenMethod]       = useState<string | null>(null);
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [bankRef]   = useState(() => "PAY-" + Date.now().toString(36).toUpperCase().slice(-8));
  const [cardNum,   setCardNum]   = useState("");
  const [expiry,    setExpiry]    = useState("");
  const [cvv,       setCvv]       = useState("");
  const [cardName,  setCardName]  = useState("");
  const [saveCard,  setSaveCard]  = useState(false);
  const [mmProvider, setMmProvider] = useState("");
  const [mmPhone,   setMmPhone]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);

  useEffect(() => {
    if (cartItems.length === 0 && !ordered && mmPhase === "idle") navigate("/cart");
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
    ...(orderNotes ? { orderNotes } : {}),
    shippingAddress: {
      firstName, lastName, email,
      phone: `${phoneCountry.dial}${phone}`,
      addressLine, city, state, country, zipCode,
      shippingId,
      shippingFee: shippingPrice,
    },
  });

  const placeOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setOrderError(null);

    const backendPaymentMethod = openMethod === "mobile" ? "MOBILE_MONEY" : openMethod === "card" ? "CARD" : openMethod === "bank" ? "BANK_TRANSFER" : openMethod === "whatsapp" ? "WHATSAPP" : "CASH_ON_DELIVERY";

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify(buildOrderPayload(backendPaymentMethod, total)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to place order");

      setPlacedOrderNumber(data.orderNumber);
      setPlacedOrderId(data.id);
      setSavedCartItems([...cartItems]);

      if (openMethod === "mobile") {
        initMobilePayment(data.id);
      } else if (openMethod === "whatsapp") {
        const msg = `Hello Kryros! I just placed order #${data.orderNumber} for ${format(total)}. Please help me complete my payment.`;
        setWaMessage(msg);
        setOrdered(true);
        clearCart();
      } else {
        setOrdered(true);
        clearCart();
      }
    } catch (err: any) {
      setOrderError(err.message);
      setIsSubmitting(false);
    }
  };

  const initMobilePayment = async (orderId: string) => {
    setMmPhase("initializing");
    try {
      const res = await fetch(`${API_BASE}/api/payments/mobile/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone: mmPhone, provider: mmProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to init mobile payment");

      setMmPhase("waiting");
      startPolling(orderId);
    } catch (err: any) {
      setMmPhase("failed_init");
      setOrderError(err.message);
      setIsSubmitting(false);
    }
  };

  const startPolling = (orderId: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(pollRef.current!);
        setMmPhase("timed_out");
        setIsSubmitting(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}`);
        const data = await res.json();
        if (data.paymentStatus === "PAID") {
          clearInterval(pollRef.current!);
          setOrdered(true);
          clearCart();
          setIsSubmitting(false);
          registerPhoneForSms(phone, `${firstName} ${lastName}`);
          sendReceiptAfterOrder(data.orderNumber, format(total), "Mobile Money");
        }
      } catch { /* ignore */ }
    }, 4000);
  };

  const goToStep2 = () => {
    if (!firstName.trim() || !lastName.trim() || (!email.trim() && !phone.trim())) {
      toast.error("Please fill in your name and at least one contact method.");
      return;
    }
    setStep(2);
  };

  const goToStep3 = () => {
    if (!country || !city || !addressLine) {
      toast.error("Please fill in your shipping address.");
      return;
    }
    setStep(3);
  };

  if (ordered) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-primary" strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Order Placed Successfully!</h1>
        <p className="text-muted-foreground mb-8">Your order <span className="font-bold text-foreground">#{placedOrderNumber}</span> has been received.</p>
        
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-5 mb-8 text-left space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-bold text-foreground">{format(total)}</span>
          </div>
          {openMethod === "whatsapp" && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">Please click the button below to send your order details to us on WhatsApp to finalize payment.</p>
              <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noreferrer" className="w-full py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold flex items-center justify-center gap-2">
                Send to WhatsApp
              </a>
            </div>
          )}
        </div>

        <Link href="/" className="w-full max-w-sm py-4 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const hasPaymentError = !!orderError || mmPhase === "failed_init" || mmPhase === "timed_out";

  return (
    <div className="max-w-lg mx-auto bg-background flex flex-col" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-5 pb-4 bg-background/90 backdrop-blur border-b border-border/40">
        <button onClick={() => navigate("/cart")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </button>
        <span className="text-[11px] font-semibold text-muted-foreground">Secure Checkout</span>
      </div>

      {/* Progress steps */}
      <div className="px-4 pt-4 pb-5">
        <div className="grid grid-cols-4 text-[11px] font-semibold text-muted-foreground mb-3">
          {[["Contact", 1], ["Address", 2], ["Shipping", 3], ["Payment", 4]].map(([label, s]) => (
            <div key={label as string} className={`flex flex-col items-center gap-1.5 ${step >= (s as number) ? "text-primary" : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${step > (s as number) ? "bg-primary border-primary text-white" : step === (s as number) ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                {step > (s as number) ? <Check className="w-3 h-3" /> : s as number}
              </div>
              <span>{label as string}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r from-primary to-[var(--kryros-primary-hover)] transition-all duration-300 ${step >= s ? "w-full" : "w-0"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* STEP 1: Contact */}
        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-card border-t border-border px-4 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Contact information</h2>
                {authUser
                  ? <span className="text-[11px] text-muted-foreground">Logged in as {authUser.email}</span>
                  : <Link href="/login" className="text-[11px] font-semibold text-primary">Log in</Link>
                }
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><User className="w-3.5 h-3.5" />First name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><User className="w-3.5 h-3.5" />Last name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />Email address
                </label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Enter your email address" className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />Mobile number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center rounded-xl border border-border bg-muted/40 overflow-hidden min-w-[115px]">
                    <input value={phoneCountry.dial} onChange={(e) => setPhoneCountry((prev) => ({ ...prev, dial: e.target.value }))} placeholder="+260" type="tel" className="w-full px-3 py-3.5 bg-transparent text-sm font-semibold text-foreground outline-none" />
                    <button type="button" onClick={() => { setShowCountryPicker(true); setCountrySearch(""); }} className="px-2 py-3.5 hover:bg-muted transition-colors border-l border-border flex-shrink-0">
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" type="tel" className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />Order notes
                </label>
                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions or notes for your order..." rows={3} className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none" />
              </div>

              {showCountryPicker && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setShowCountryPicker(false)}>
                  <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">Select Country Code</h3>
                      <button onClick={() => setShowCountryPicker(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/60 border border-border">
                        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <input autoFocus value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} placeholder="Search country..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-64 divide-y divide-border/50">
                      {DIAL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)).map((c) => (
                        <button key={c.code} onClick={() => { setPhoneCountry(c); setShowCountryPicker(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 transition-colors ${phoneCountry.code === c.code ? "bg-primary/5 text-primary font-semibold" : "text-foreground"}`}>
                          <span className="flex-1 text-left">{c.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{c.dial}</span>
                          {phoneCountry.code === c.code && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-4 border-t border-border/40 bg-background">
              <button onClick={goToStep2} className="w-full py-4 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-bold flex items-center justify-center gap-2">
                Continue to Address <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Address */}
        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-card border-t border-border px-4 py-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground">Shipping address</h2>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Globe className="w-3 h-3" />Country
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary appearance-none transition-all"
                  >
                    <option value="">Select your country...</option>
                    {shippingCountries.length > 0
                      ? shippingCountries.map((c) =>
                          c.isActive && c.shippingEnabled ? (
                            <option key={c.code} value={c.name}>{c.name}</option>
                          ) : (
                            <option key={c.code} value={c.name} disabled>{c.name} (Coming soon)</option>
                          )
                        )
                      : <option value="Zambia">Zambia</option>
                    }
                  </select>
                  <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><MapPin className="w-3 h-3" />State / Province</label>
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State / Province" className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Home className="w-3 h-3" />City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><MapPin className="w-3 h-3" />Address</label>
                <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Street name, building, house number" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><MapPin className="w-3 h-3" />ZIP / Postal code (optional)</label>
                <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="10101" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
            </div>
            <div className="px-4 py-4 border-t border-border/40 bg-background space-y-2">
              <button onClick={goToStep3} className="w-full py-4 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-bold flex items-center justify-center gap-2">
                Continue to Shipping <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep(1)} className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors py-2">← Back to Contact</button>
            </div>
          </div>
        )}

        {/* STEP 3: Shipping */}
        {step === 3 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-card border-t border-border px-4 py-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground">
                Delivery options <span className="text-[11px] text-muted-foreground font-normal">(for {city || "your area"})</span>
              </h2>
              <div className="space-y-3">
                {shippingLoading ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-full h-[72px] rounded-2xl border border-border bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                ) : shippingMethods.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <Truck className="w-8 h-8 opacity-40" />
                    <p className="text-sm">No shipping methods available.</p>
                  </div>
                ) : (
                  shippingMethods.map((option) => {
                    const fee = Number(option.fee ?? 0);
                    const isSelected = shippingId === option.id;
                    const Icon = /express|fast|quick/i.test(option.name) ? Zap : /priority|next.?day|overnight/i.test(option.name) ? Clock : Truck;
                    return (
                      <button key={option.id} onClick={() => setShippingId(option.id)} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}>
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary text-white" : "bg-muted text-foreground"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{option.name}</p>
                            <p className="text-sm font-semibold text-foreground">{fee === 0 ? "Free" : format(fee)}</p>
                          </div>
                          {(option.description || option.estimatedDays) && (
                            <p className="text-xs text-muted-foreground mt-0.5">{option.description || option.estimatedDays}</p>
                          )}
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${isSelected ? "border-primary bg-primary text-white" : "border-border bg-background"}`}>
                          {isSelected && "✓"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="px-4 py-4 border-t border-border/40 bg-background space-y-2">
              <button onClick={() => setStep(4)} className="w-full py-4 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-bold flex items-center justify-center gap-2">
                Continue to Payment <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep(2)} className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors py-2">← Back to Address</button>
            </div>
          </div>
        )}

        {/* STEP 4: Payment */}
        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-card border-t border-border px-4 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">How would you like to pay?</h2>
                <span className="text-[11px] text-muted-foreground">Powered by Kryros Pay</span>
              </div>

              {hasPaymentError && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-900/30 text-[11px] text-red-600 dark:text-red-300 flex items-start gap-2">
                  <X className="w-3 h-3 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">{mmPhase === "timed_out" ? "Timed out" : "Payment Error"}</p>
                    <p>{orderError || "Please try again."}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {activeCheckoutMethods.length > 0 ? (
                  activeCheckoutMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div key={method.id} className="space-y-2">
                        <button onClick={() => { setOpenMethod(openMethod === method.id ? null : method.id); setOrderError(null); setMmPhase("idle"); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${openMethod === method.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${method.iconBg}`}><Icon /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">{method.label}</p>
                            <p className="text-[11px] text-muted-foreground">{method.id === "mobile" ? mobileNetworks.join(", ") : method.sub}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openMethod === method.id ? "rotate-180" : ""}`} />
                        </button>

                        {openMethod === method.id && (
                          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            {method.id === "mobile" && (
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Network</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {mobileNetworks.map((net) => (
                                      <button key={net} onClick={() => setMmProvider(net)} className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${mmProvider === net ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground"}`}>
                                        {net}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                                  <input value={mmPhone} onChange={(e) => setMmPhone(e.target.value)} placeholder="09XXXXXXXX" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                                </div>
                              </div>
                            )}

                            {method.id === "bank" && (
                              <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">Please transfer <span className="font-bold text-foreground">{format(total)}</span> to any of the accounts below and upload proof of payment.</p>
                                {bankProviders.map((bank, i) => (
                                  <div key={i} className="p-3 rounded-xl bg-background border border-border space-y-2">
                                    <p className="text-xs font-bold text-foreground">{bank.name}</p>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] text-muted-foreground">Acc: {bank.config?.accountNumber}</span>
                                      <CopyBtn text={bank.config?.accountNumber || ""} />
                                    </div>
                                  </div>
                                ))}
                                <button onClick={() => fileRef.current?.click()} className="w-full py-3 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-1 hover:border-primary/50 transition-colors">
                                  <Upload className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-[10px] font-semibold text-muted-foreground">{proofFile ? "Proof uploaded" : "Upload Proof of Payment"}</span>
                                </button>
                                <input type="file" ref={fileRef} className="hidden" onChange={(e) => setProofFile(e.target.files?.[0]?.name || null)} />
                              </div>
                            )}

                            {method.id === "whatsapp" && (
                              <p className="text-xs text-muted-foreground">You will be redirected to WhatsApp to complete your payment with our support team after placing the order.</p>
                            )}

                            <button onClick={placeOrder} disabled={isSubmitting} className="w-full py-3.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
                              {isSubmitting ? "Processing..." : `Pay ${format(total)}`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No payment methods available.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-4 border-t border-border/40 bg-background">
              <button onClick={() => setStep(3)} className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors py-2">← Back to Shipping</button>
              <SecureFooter />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
