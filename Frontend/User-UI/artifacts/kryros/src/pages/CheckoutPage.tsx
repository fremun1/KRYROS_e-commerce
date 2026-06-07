import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { API_BASE } from "@/lib/api";
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
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.788-1.653-2.086-.173-.298-.018-.459.13-.608.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.208-.242-.58-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.413.248-.695.248-1.291.173-1.413-.074-.123-.272-.198-.57-.347M11.886 3.004h.009c2.62 0 5.077 1.02 6.928 2.872 1.845 1.851 2.861 4.304 2.859 6.92-.004 5.394-4.394 9.78-9.79 9.78-1.676-.003-3.32-.428-4.78-1.236L3 21l.664-3.872a9.76 9.76 0 01-1.32-4.86c.003-5.39 4.394-9.78 9.78-9.78m0-2.004C5.322.999.5 5.82.498 12.135c0 2.19.576 4.326 1.668 6.2L.057 24l5.792-2.078a11.87 11.87 0 006.04 1.63h.005c6.313 0 11.44-5.128 11.445-11.438.003-3.06-1.187-5.94-3.346-8.104A11.43 11.43 0 0011.886.999z" />
      </svg>
    ),
    iconBg: "bg-green-50 dark:bg-green-900/20",
  },
];

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
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const authUser = useAuthStore((s) => s.user);
  const authToken = useAuthStore((s) => s.token);
  const format = useCurrencyStore((s) => s.format);

  // Silent fire-and-forget: register customer phone for SMS marketing
  const registerPhoneForSms = (customerPhone: string, customerName: string) => {
    if (!customerPhone?.trim()) return;
    fetch(`${API_BASE}/api/notifications/sms/contacts/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: customerPhone.trim(),
        name: customerName.trim() || undefined,
        source: "Checkout",
      }),
    }).catch(() => {}); // silent — never block the checkout flow
  };

  // Fire payment receipt via SMS and/or email after successful order
  const sendReceiptAfterOrder = (orderRef: string, amountFormatted: string, method: string) => {
    const customerPhone = phone.trim();
    const customerEmail = email.trim();
    if (!customerPhone && !customerEmail) return;
    fetch(`${API_BASE}/api/notifications/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: customerPhone || undefined,
        email: customerEmail || undefined,
        orderRef,
        amount: amountFormatted,
        currency: selectedCurrency.symbol || selectedCurrency.code,
        customerName: `${firstName} ${lastName}`.trim() || "Customer",
        paymentMethod: method,
        status: "completed",
      }),
    }).catch(() => {}); // silent — never block the UI
  };

  const selectedCurrency = useCurrencyStore((s) => s.selected);
  const allCurrencies = useCurrencyStore((s) => s.currencies);

  const [step, setStep] = useState(1);

  // ── Dynamic payment config from admin panel ─────────────────────────────
  const [bankProviders, setBankProviders] = useState<
    { name: string; config?: { accountName?: string; accountNumber?: string } }[]
  >([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>(["MTN", "Airtel", "Zamtel", "M-Pesa"]);
  const [apiMethodTypes, setApiMethodTypes] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-config/public`)
      .then((r) => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : data?.data ?? [];

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
                .map((n: any) => n.name as string),
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
    mobile_wallet: "mobile",
    card: "card",
    bank: "bank",
    cash: "cod",
    digital_wallet: "whatsapp",
  };
  const activeCheckoutMethods =
    apiMethodTypes.length > 0
      ? (apiMethodTypes
          .map((t) => DEFAULT_CHECKOUT_METHODS.find((m) => m.id === (TYPE_TO_ID[t] ?? t)))
          .filter(Boolean) as typeof DEFAULT_CHECKOUT_METHODS)
      : DEFAULT_CHECKOUT_METHODS;

  // Force WhatsApp to be present if it's missing but we want it
  if (!activeCheckoutMethods.find((m) => m.id === "whatsapp")) {
    const wa = DEFAULT_CHECKOUT_METHODS.find((m) => m.id === "whatsapp");
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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
      email,
      firstName,
      lastName,
      phone,
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
      } catch {
        // ignore
      }
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
        const msg = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message || "Failed to place order.";
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
        card: "CARD",
        bank: "BANK_TRANSFER",
        whatsapp: "WHATSAPP",
        apple: "CARD",
        google: "CARD",
        crypto: "CARD",
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
        const msg = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message || "Failed to place order.";
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
        const msg = `*New Order: ${orderNum}*\n\n*Customer:*\n${firstName} ${lastName}\n${phone}\n\n*Items:*\n${itemsList}\n\n*Total:* ${format(
          total,
        )}\n\n*Payment Method:* WhatsApp Transfer\nPlease confirm my payment. Thank you!`;
        setWaMessage(msg);
        setOrdered(true);
        clearCart();
        // Register phone number for SMS marketing (silent, non-blocking)
        registerPhoneForSms(phone, `${firstName} ${lastName}`);
        // Send receipt via SMS + email
        sendReceiptAfterOrder(orderNum, total.toFixed(2), "WhatsApp Payment");
        // Auto-redirect to WhatsApp for better UX
        const url = `[wa.me](https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)})`;
        window.open(url, "_blank");
      } else {
        setOrdered(true);
        clearCart();
        // Register phone number for SMS marketing (silent, non-blocking)
        registerPhoneForSms(phone, `${firstName} ${lastName}`);
        // Send receipt via SMS + email
        sendReceiptAfterOrder(
          orderNum,
          total.toFixed(2),
          openMethod === "bank" ? "Bank Transfer" : "Card Payment",
        );
      }
    } catch {
      setOrderError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const url = `[wa.me](https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)})`;
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
            <p className="text-sm text-muted-foreground">
              Order Number: <span className="font-bold text-foreground">#{placedOrderNumber}</span>
            </p>
          </div>
          <div className="w-full bg-card border border-border rounded-3xl p-5 space-y-4">
            <div className="space-y-3">
              {savedCartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.qty}× {item.name}
                  </span>
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
              {isManual
                ? "We'll confirm your order once we verify your payment."
                : `Thank you${firstName ? `, ${firstName}` : ""}! Your order is confirmed.`}
            </p>
            {isManual && (
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 text-xs text-primary font-medium">
                {openMethod === "whatsapp"
                  ? "Our team will contact you on WhatsApp to confirm your payment."
                  : "Send your proof of transfer to support. Once confirmed, your order will be processed."}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {openMethod === "whatsapp" && (
            <button
              onClick={handleWhatsAppRedirect}
              className="w-full py-4 bg-[var(--kryros-primary-hover)] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold">
                WA
              </span>
              <span>Open WhatsApp</span>
            </button>
          )}
          <Link href="/shop">
            <button className="w-full py-3 rounded-2xl border border-border bg-background text-sm font-semibold hover:bg-primary/5 transition-colors">
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const hasPaymentError = !!orderError || mmPhase === "failed_init" || mmPhase === "timed_out";

  return (
    <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-5 pb-3 bg-background/90 backdrop-blur">
        <button
          onClick={() => navigate("/cart")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Cart
        </button>
        <span className="text-[11px] font-semibold text-muted-foreground">Secure Checkout</span>
      </div>

      {/* Progress steps */}
      <div className="px-4 pb-4">
        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-2">
          <span className={step >= 1 ? "text-primary" : ""}>Contact</span>
          <span className={step >= 2 ? "text-primary" : ""}>Address</span>
          <span className={step >= 3 ? "text-primary" : ""}>Shipping</span>
          <span className={step >= 4 ? "text-primary" : ""}>Payment</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--kryros-primary-hover)] transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
        {/* Contact info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-3xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Contact information</h2>
                {authUser ? (
                  <span className="text-[11px] text-muted-foreground">Logged in as {authUser.email}</span>
                ) : (
                  <Link href="/login" className="text-[11px] font-semibold text-primary">
                    Log in
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <User className="w-3 h-3" />
                    First name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <User className="w-3 h-3" />
                    Last name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  Email address
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  Mobile number
                </label>
                <div className="flex gap-2">
                  <div className="min-w-[90px] flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/40 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="text-xs">🇿🇲</span>
                      <span>+260</span>
                    </span>
                  </div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="97 000 0000"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!email || !phone || !firstName || !lastName}
              className="w-full py-3 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Address
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Address */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-3xl p-4 space-y-4">
              <h2 className="text-sm font-bold text-foreground">Shipping address</h2>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  Country
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 pr-8 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                  >
                    <option value="Zambia">Zambia</option>
                    <option value="Zimbabwe" disabled>
                      Zimbabwe (Coming soon)
                    </option>
                    <option value="Malawi" disabled>
                      Malawi (Coming soon)
                    </option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    State / Province
                  </label>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Lusaka Province"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Home className="w-3 h-3" />
                    City
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lusaka"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  Address
                </label>
                <input
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Street name, building, house number"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  ZIP / Postal code (optional)
                </label>
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="10101"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!country || !city || (!addressLine && (!state || !zipCode))}
              className="w-full py-3 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Shipping
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setStep(1)}
              className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors py-2"
            >
              ← Back to Contact
            </button>
          </div>
        )}

        {/* Shipping */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-3xl p-4 space-y-4">
              <h2 className="text-sm font-bold text-foreground">
                Delivery options{" "}
                <span className="text-[11px] text-muted-foreground font-normal">(for {city || "your area"})</span>
              </h2>

              <div className="space-y-3">
                {SHIPPING_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = shippingId === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setShippingId(option.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-primary text-white" : "bg-muted text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{option.label}</p>
                          <p className="text-xs font-semibold text-foreground">
                            {option.price === 0 ? "Free" : format(option.price)}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{option.detail}</p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${
                          isSelected ? "border-primary bg-primary text-white" : "border-border bg-background"
                        }`}
                      >
                        {isSelected && "✓"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full py-3 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              Continue to Payment
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setStep(2)}
              className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors py-2"
            >
              ← Back to Address
            </button>
          </div>
        )}

        {/* Payment methods summary */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-3xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">How would you like to pay?</h2>
                <span className="text-[11px] text-muted-foreground">Powered by Kryros Pay</span>
              </div>

              {hasPaymentError && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-900/30 text-[11px] text-red-600 dark:text-red-300 flex items-start gap-2">
                  <X className="w-3 h-3 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">
                      {mmPhase === "timed_out"
                        ? "We couldn't confirm your payment in time."
                        : "We couldn't initialize your payment."}
                    </p>
                    <p>
                      {orderError ||
                        "Please try again, or choose a different payment method. If the problem continues, contact support."}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {activeCheckoutMethods.map((method) => {
                  const Icon = method.icon;
                  const selected = openMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setOpenMethod(method.id);
                        setOrderError(null);
                        setMmPhase("idle");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${method.iconBg}`}>
                        <Icon />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{method.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{method.sub}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>

              {mmPhase === "waiting" && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-700 dark:text-amber-200 flex items-start gap-2">
                  <Clock className="w-3 h-3 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">Waiting for your mobile money payment…</p>
                    <p>Check your phone and approve the payment prompt. This can take up to 3 minutes.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{format(SUBTOTAL)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">{shippingPrice === 0 ? "Free" : format(shippingPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estimated tax</span>
                <span className="font-semibold">{format(TAX)}</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-black">
                <span>Total</span>
                <span className="text-primary">{format(total)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                All payments are processed securely. By completing your purchase, you agree to our Terms of Service.
              </p>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors py-2"
            >
              ← Back to Shipping
            </button>
          </div>
        )}
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
                <div>
                  <p className="text-xs font-bold text-foreground">Complete your payment</p>
                  <p className="text-[11px] text-muted-foreground">
                    Order Total: <span className="font-semibold">{format(total)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setOpenMethod(null)}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* ── MOBILE MONEY ── */}
              {openMethod === "mobile" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Choose mobile network</p>
                    <div className="grid grid-cols-2 gap-2">
                      {mobileNetworks.map((network) => (
                        <button
                          key={network}
                          onClick={() => setMmProvider(`${network} Mobile Money`)}
                          className={`flex items-center justify-between px-3 py-2 rounded-2xl border text-xs ${
                            mmProvider.startsWith(network)
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          <span>{network}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Mobile Money</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      Mobile Money number
                    </label>
                    <input
                      value={mmPhone}
                      onChange={(e) => setMmPhone(e.target.value)}
                      placeholder="Enter the number to be charged"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      We&apos;ll send a payment prompt to this number. Approve it to complete your order.
                    </p>
                  </div>

                  <div className="border border-amber-200 dark:border-amber-900/40 rounded-2xl bg-amber-50/80 dark:bg-amber-900/10 p-3 flex items-start gap-2">
                    <Clock className="w-3 h-3 text-amber-600 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-200">
                      Make sure your phone is turned on and has network signal. The payment prompt may take up to 2
                      minutes.
                    </p>
                  </div>

                  <button
                    disabled={isSubmitting || !mmPhone.trim()}
                    onClick={handleMobileMoneyPay}
                    className="w-full py-3 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {isSubmitting ? "Initializing payment…" : "Pay with Mobile Money"}
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* ── CARD PAYMENT ── */}
              {openMethod === "card" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <CreditCard className="w-3 h-3" />
                      Card number
                    </label>
                    <input
                      value={cardNum}
                      onChange={(e) => setCardNum(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Expiry date
                      </label>
                      <input
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        CVV
                      </label>
                      <input
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <User className="w-3 h-3" />
                      Name on card
                    </label>
                    <input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="As shown on card"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="w-3 h-3 rounded border-border"
                    />
                    <span>Save this card securely for faster checkout next time.</span>
                  </label>

                  <button
                    disabled={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="w-full py-3 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {isSubmitting ? "Processing payment…" : "Pay with Card"}
                  </button>
                  <SecureFooter />
                </div>
              )}

              {/* ── BANK TRANSFER ── */}
              {openMethod === "bank" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Select bank account</p>
                    <div className="space-y-2">
                      {(bankProviders.length > 0 ? bankProviders : [{ name: "Kryros Primary Account" }]).map(
                        (provider, idx) => (
                          <div
                            key={idx}
                            className="border border-border rounded-2xl p-3 text-[11px] space-y-1.5 bg-muted/40"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{provider.name}</span>
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[10px]">
                                Recommended
                              </span>
                            </div>
                            {provider.config?.accountName && (
                              <p className="flex items-center justify-between">
                                <span className="text-muted-foreground">Account name</span>
                                <span className="font-semibold text-foreground">{provider.config.accountName}</span>
                              </p>
                            )}
                            {provider.config?.accountNumber && (
                              <p className="flex items-center justify-between">
                                <span className="text-muted-foreground">Account number</span>
                                <span className="font-semibold text-foreground">{provider.config.accountNumber}</span>
                              </p>
                            )}
                            <p className="flex items-center justify-between">
                              <span className="text-muted-foreground">Amount</span>
                              <span className="font-semibold text-foreground">{format(total)}</span>
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <Upload className="w-3 h-3" />
                      Upload proof of payment (optional)
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProofFile(file.name);
                        } else {
                          setProofFile(null);
                        }
                      }}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-border bg-background text-xs text-muted-foreground hover:border-primary/40"
                    >
                      <span>{proofFile || "Choose file or take a photo"}</span>
                      <Upload className="w-3 h-3" />
                    </button>
                    <p className="text-[10px] text-muted-foreground">
                      Uploading a receipt or screenshot helps us verify your payment faster.
                    </p>
                  </div>

                  <button
                    disabled={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="w-full py-3 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
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
                      <svg
                        viewBox="0 0 24 24"
                        className="w-9 h-9"
                        fill="currentColor"
                        style={{ color: "var(--kryros-primary-hover)" }}
                      >
                        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.17 5.3 5.186.286 11.49.286c3.17 0 6.146 1.237 8.388 3.48a11.79 11.79 0 013.482 8.401c-.003 6.308-5.17 11.42-11.49 11.42a11.9 11.9 0 01-5.946-1.606L.057 24zm6.597-3.807c1.766 1.05 3.066 1.693 4.947 1.693 5.448 0 9.886-4.434 9.889-9.877.003-5.462-4.415-9.89-9.881-9.894-5.452 0-9.884 4.432-9.884 9.884a9.84 9.84 0 001.774 5.576l-.999 3.648 3.154-.93z" />
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.788-1.653-2.086-.173-.298-.018-.459.13-.608.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.208-.242-.58-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.413.248-.695.248-1.291.173-1.413-.074-.123-.272-.198-.57-.347" />
                      </svg>
                    </div>
                    <p className="text-sm text-center text-muted-foreground px-4">
                      You will be redirected to WhatsApp to complete your payment securely.
                    </p>
                  </div>
                  <div className="border-t border-border pt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">{format(SUBTOTAL)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-semibold">
                        {shippingPrice === 0 ? "Free" : format(shippingPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{format(total)}</span>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="w-full py-3 rounded-2xl bg-[var(--kryros-primary-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {isSubmitting ? "Preparing WhatsApp…" : "Pay via WhatsApp"}
                  </button>
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
