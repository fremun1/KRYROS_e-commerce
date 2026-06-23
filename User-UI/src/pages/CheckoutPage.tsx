import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { API_BASE, fetchMatchingShippingMethods, fetchSettings, ApiShippingMethod } from "@/lib/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  ChevronLeft,
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
  Package,
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
  { id: "mobile",   label: "Mobile Money",   sub: "MTN, Airtel, Zamtel",       icon: Smartphone, iconBg: "bg-primary/10" },
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

interface PickupStation {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
  isActive: boolean;
}

function normalizePickupStation(s: any): PickupStation {
  const addressParts = [s.address, s.city, s.state, s.country].filter(Boolean);
  return {
    id: s.id,
    name: s.name,
    address: addressParts.join(", ") || "",
    city: s.city || "",
    hours: s.openingHours || "",
    isActive: s.isActive !== false,
  };
}

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

// Numbered section header used for every section (1. Shipping Information, 2. Pickup Station, etc.)
function SectionHeader({ number, icon: Icon, title }: { number: number; icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
        {number}
      </div>
      <Icon className="w-4 h-4 text-foreground flex-shrink-0" />
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
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

  // ── State ────────────────────────────────────────────────────────────────
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

  // Shipping Information (Section 1)
  const [firstName,     setFirstName]     = useState(authUser?.firstName ?? "");
  const [lastName,      setLastName]      = useState(authUser?.lastName ?? "");
  const [email,         setEmail]         = useState(authUser?.email ?? "");
  const [phone,         setPhone]         = useState("");
  const [orderNotes,    setOrderNotes]    = useState("");
  const [phoneCountry,  setPhoneCountry]  = useState(DIAL_COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [country,      setCountry]     = useState("");
  const [state,        setState]       = useState("");
  const [city,         setCity]        = useState("");
  const [addressLine,  setAddressLine] = useState("");
  const [zipCode,      setZipCode]     = useState("");

  // Pickup Station (Section 2)
  const [pickupStations, setPickupStations] = useState<PickupStation[]>([]);
  const [pickupStationId, setPickupStationId] = useState("");
  const [loadingStations, setLoadingStations] = useState(false);
  const [showStationDrop, setShowStationDrop] = useState(false);

  // Shipping Method (Section 3) & totals
  const [shippingMethods, setShippingMethods] = useState<ApiShippingMethod[]>([]);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingId, setShippingId] = useState("");
  const selectedShipping = shippingMethods.find((m) => m.id === shippingId);
  const shippingPrice = selectedShipping ? Number(selectedShipping.fee) : 0;

  const SUBTOTAL = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const DISCOUNT = 0;
  const [feeRate, setFeeRate] = useState(0);
  const PROCESSING_FEE = SUBTOTAL * feeRate;
  const total = SUBTOTAL - DISCOUNT + PROCESSING_FEE + shippingPrice;

  // Payment Method (Section 4) — openMethod now controls inline expansion, not a bottom sheet
  const [openMethod,       setOpenMethod]       = useState<string | null>("mobile");
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [bankRef]   = useState(() => "PAY-" + Date.now().toString(36).toUpperCase().slice(-8));
  const [cardNum,   setCardNum]   = useState("");
  const [expiry,    setExpiry]    = useState("");
  const [cvv,       setCvv]       = useState("");
  const [cardName,  setCardName]  = useState("");
  const [mmProvider, setMmProvider] = useState("MTN");
  const [mmPhone,   setMmPhone]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);

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
        const defaultCountry = mapped.find((c) => c.isActive && c.shippingEnabled);
        if (defaultCountry && !country) setCountry(defaultCountry.name);
      })
      .catch(() => {
        setShippingCountries([{ name: 'Zambia', code: 'ZM', shippingEnabled: true, isActive: true }]);
      });
  }, []);

  // ── Pickup stations (Section 2) ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingStations(true);
    fetch(`${API_BASE}/api/pickup-stations?active=true`)
      .then((r) => r.json())
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        if (!cancelled) {
          setPickupStations(list.filter((s: any) => s.isActive !== false).map(normalizePickupStation));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingStations(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Dynamic shipping methods — now fetched as soon as we have a country/city instead of gated by step ──
  useEffect(() => {
    if (country) {
      setIsLoadingShipping(true);
      fetchMatchingShippingMethods({
        stateName: state,
        cityName: city,
        manual: true,
      })
        .then((methods) => {
          setShippingMethods(methods);
          if (methods.length > 0 && !shippingId) {
            setShippingId(methods[0].id);
          }
        })
        .finally(() => setIsLoadingShipping(false));
    }
  }, [country, state, city]);

  // ── Dynamic payment config from admin panel ─────────────────────────────────
  const [bankProviders, setBankProviders]   = useState<{ name: string; config?: { accountName?: string; accountNumber?: string } }[]>([]);
  const [mobileNetworks, setMobileNetworks] = useState<string[]>(["MTN", "Airtel", "Zamtel", "M-Pesa"]);
  const [apiMethodTypes, setApiMethodTypes] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-config/public`)
      .then((r) => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : data?.data ?? [];
        const bankMethod = arr.find((m: any) => m.type === "bank");
        if (bankMethod?.providers) {
          setBankProviders(bankMethod.providers.filter((p: any) => p.isEnabled));
        }
        const mobileMethod = arr.find((m: any) => m.type === "mobile_wallet");
        if (mobileMethod?.providers?.length > 0) {
          const nets: string[] = mobileMethod.providers
            .filter((p: any) => p.isEnabled)
            .flatMap((p: any) =>
              (p.networks || [])
                .filter((n: any) => n.isEnabled)
                .map((n: any) => (n.name as string).replace(/\s*Mobile\s*Money\s*/i, "").trim()),
            );
          if (nets.length > 0) setMobileNetworks(nets);
        }
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

  const TYPE_TO_ID: Record<string, string> = {
    mobile_wallet: "mobile", card: "card", bank: "bank", cash: "cod", digital_wallet: "whatsapp",
  };
  const activeCheckoutMethods =
    apiMethodTypes.length > 0
      ? (apiMethodTypes.map((t) => DEFAULT_CHECKOUT_METHODS.find((m) => m.id === (TYPE_TO_ID[t] ?? t))).filter(Boolean) as typeof DEFAULT_CHECKOUT_METHODS)
      : [...DEFAULT_CHECKOUT_METHODS];

  if (!activeCheckoutMethods.find((m) => m.id === "whatsapp")) {
    const wa = DEFAULT_CHECKOUT_METHODS.find((m) => m.id === "whatsapp");
    if (wa) activeCheckoutMethods.push(wa);
  }

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
    ...(openMethod === "mobile" && mmProvider ? { notes: `Mobile money provider: ${mmProvider}${orderNotes ? ` | Notes: ${orderNotes}` : ""}` } : orderNotes ? { notes: orderNotes } : {}),
    addressDetails: {
      email, firstName, lastName, phone,
      address: addressLine || `${city}, ${state}, ${country}`,
      zipCode: zipCode || undefined,
      countryName: country, stateName: state || undefined, cityName: city || undefined, manual: true,
      pickupStationId: pickupStationId || undefined,
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
          registerPhoneForSms(phone, `${firstName} ${lastName}`);
          sendReceiptAfterOrder(orderNum, total.toFixed(2), `Mobile Money (${mmProvider})`);
          setMmPhase("idle");
        } else if (status === "FAILED") {
          clearInterval(pollRef.current!);
          setMmPhase("failed_init");
        }
      } catch { /* ignore */ }
    }, 5000);
  };

  const validateShippingInfo = () => {
    if (!firstName.trim()) { toast.error("Please enter your first name"); return false; }
    if (!lastName.trim())  { toast.error("Please enter your last name");  return false; }
    if (!email.trim() && !phone.trim()) { toast.error("Please provide at least an email or phone number"); return false; }
    if (!country) { toast.error("Please select a country"); return false; }
    if (!city.trim()) { toast.error("Please enter your city"); return false; }
    if (!addressLine.trim()) { toast.error("Please enter your address"); return false; }
    return true;
  };

  const handleMobileMoneyPay = async () => {
    if (isSubmitting || !mmPhone.trim()) return;
    if (!validateShippingInfo()) return;
    setIsSubmitting(true);
    setOrderError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const exchangeRate = selectedCurrency.exchangeRate || 1;
      const totalLocal = total * exchangeRate;
      const res = await fetch(`${API_BASE}/api/orders`, { method: "POST", headers, body: JSON.stringify(buildOrderPayload("MOBILE_MONEY", totalLocal)) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Failed to place order.";
        setOrderError(msg);
        toast.error(msg);
        setIsSubmitting(false);
        return;
      }
      const orderId  = data.id ?? "";
      const orderNum = data.orderNumber ?? data.id ?? "";
      setPlacedOrderId(orderId);
      setSavedCartItems([...cartItems]);
      setMmPhase("initializing");
      try {
        const initRes = await fetch(`${API_BASE}/api/payments/initialize`, { method: "POST", headers, body: JSON.stringify({ orderId, phone: mmPhone, amount: Math.round(totalLocal * 100) / 100 }) });
        if (!initRes.ok) { setMmPhase("failed_init"); setIsSubmitting(false); return; }
        setMmPhase("waiting");
        startPolling(orderId, orderNum);
      } catch { setMmPhase("failed_init"); }
    } catch {
      const msg = "Network error. Please check your connection and try again.";
      setOrderError(msg);
      toast.error(msg);
    } finally { setIsSubmitting(false); }
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting || cartItems.length === 0) return;
    if (!validateShippingInfo()) return;
    setIsSubmitting(true);
    setOrderError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const PAYMENT_METHOD_MAP: Record<string, string> = { card: "CARD", bank: "BANK_TRANSFER", whatsapp: "WHATSAPP", apple: "CARD", google: "CARD", crypto: "CARD" };
      const backendPaymentMethod = PAYMENT_METHOD_MAP[openMethod ?? "card"] ?? "CARD";
      const exchangeRate = selectedCurrency.exchangeRate || 1;
      const totalLocal = total * exchangeRate;
      const res = await fetch(`${API_BASE}/api/orders`, { method: "POST", headers, body: JSON.stringify(buildOrderPayload(backendPaymentMethod, totalLocal)) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Failed to place order.";
        setOrderError(msg);
        toast.error(msg);
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
        registerPhoneForSms(phone, `${firstName} ${lastName}`);
        sendReceiptAfterOrder(orderNum, total.toFixed(2), "WhatsApp Payment");
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
      } else {
        setOrdered(true);
        clearCart();
        registerPhoneForSms(phone, `${firstName} ${lastName}`);
        sendReceiptAfterOrder(orderNum, total.toFixed(2), openMethod === "bank" ? "Bank Transfer" : "Card Payment");
      }
    } catch {
      const msg = "Network error. Please check your connection and try again.";
      setOrderError(msg);
      toast.error(msg);
    } finally { setIsSubmitting(false); }
  };

  const handleWhatsAppRedirect = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank");
  };

  // ── Order confirmation screen ───────────────────────────────────────────────
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
            <button onClick={handleWhatsAppRedirect} className="w-full py-4 bg-[var(--kryros-primary-hover)] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold">WA</span>
              <span>Open WhatsApp</span>
            </button>
          )}
          <Link href="/">
            <button className="w-full py-3 rounded-2xl border border-border bg-background text-sm font-semibold hover:bg-primary/5 transition-colors">Continue Shopping</button>
          </Link>
        </div>
      </div>
    );
  }

  const hasPaymentError = !!orderError || mmPhase === "failed_init" || mmPhase === "timed_out";
  const selectedStation = pickupStations.find((s) => s.id === pickupStationId);

  // Icon used per shipping method id, matching reference (truck / truck / rocket)
  const shippingIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("express") || n.includes("same day") || n.includes("next day")) return Zap;
    return Truck;
  };

  return (
    <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-5 pb-3 bg-background/90 backdrop-blur border-b border-border/60">
        <button onClick={() => navigate("/cart")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </button>
        <span className="text-base font-bold text-foreground absolute left-1/2 -translate-x-1/2">Checkout</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
          <Lock className="w-3 h-3" /> Secure Checkout
        </span>
      </div>

      {/* Single scrolling page — all sections always visible */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">

        {/* ── SECTION 1: Shipping Information ── */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={1} icon={User} title="Shipping Information" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><User className="w-3 h-3" />First Name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter first name" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><User className="w-3 h-3" />Last Name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter last name" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
            </div>

            {/* Phone Number gets its own full-width row so the dial code + number both have room */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Phone className="w-3 h-3" />Phone Number</label>
              <div className="flex gap-1.5">
                <div className="w-[88px] rounded-xl border border-border bg-muted/40 flex items-center flex-shrink-0 overflow-hidden">
                  <input
                    list="checkout-dial-codes"
                    value={phoneCountry.dial}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      const match = DIAL_COUNTRIES.find((c) => c.dial === nextValue || c.name.toLowerCase() === nextValue.toLowerCase());
                      setPhoneCountry(match ?? { ...phoneCountry, dial: nextValue });
                    }}
                    placeholder="+1"
                    type="text"
                    className="w-full min-w-0 px-3 py-3 bg-transparent text-sm font-semibold text-foreground outline-none"
                  />
                  <datalist id="checkout-dial-codes">
                    {DIAL_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.dial}>{c.name}</option>
                    ))}
                  </datalist>
                </div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" type="tel" className="flex-1 min-w-0 px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Mail className="w-3 h-3" />Email Address</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><MapPin className="w-3 h-3" />Address</label>
                <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Enter street address" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Home className="w-3 h-3" />Town / City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter city" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><MapPin className="w-3 h-3" />Province / State</label>
                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Enter province / state" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Mail className="w-3 h-3" />Postal Code</label>
                <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="Enter postal code" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Globe className="w-3 h-3" />Country</label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-[46px] rounded-xl border-border bg-background px-3.5 text-sm shadow-none focus:ring-2 focus:ring-primary/40 focus:border-primary">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
                    {shippingCountries.length > 0 ? (
                      shippingCountries.map((c) => (
                        <SelectItem key={c.code} value={c.name} disabled={!c.isActive || !c.shippingEnabled} className="py-2.5">
                          {!c.isActive || !c.shippingEnabled ? `${c.name} (Coming soon)` : c.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="Zambia">Zambia</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Country picker modal (for phone dial code) — kept available, opened from a small link */}
          <button type="button" onClick={() => { setShowCountryPicker(true); setCountrySearch(""); }} className="text-[10px] text-primary font-semibold mt-2 hover:underline">
            Change dial code
          </button>
          {showCountryPicker && (
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setShowCountryPicker(false)}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
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

        {/* ── SECTION 2: Pickup Station ── */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={2} icon={Package} title="Pickup Station" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStationDrop((v) => !v)}
              className="w-full flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-3 bg-background hover:border-primary/50 transition-colors"
            >
              <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className={`flex-1 text-sm text-left ${selectedStation ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {loadingStations ? "Loading stations…" : selectedStation ? selectedStation.name : "Choose Pickup Station"}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${showStationDrop ? "rotate-180" : ""}`} />
            </button>
            {showStationDrop && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setPickupStationId(""); setShowStationDrop(false); }}
                  className="w-full flex items-center px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border text-sm text-muted-foreground"
                >
                  No pickup station (deliver to address)
                </button>
                {pickupStations.length === 0 && !loadingStations && (
                  <div className="px-4 py-3 text-xs text-muted-foreground">No pickup stations available yet.</div>
                )}
                {pickupStations.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setPickupStationId(s.id); setShowStationDrop(false); }}
                    className={`w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 ${pickupStationId === s.id ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${pickupStationId === s.id ? "text-primary" : "text-foreground"}`}>{s.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{s.address}</p>
                    </div>
                    {pickupStationId === s.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground mt-2">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {"Your order will be delivered to the selected pickup station."}
          </p>
        </div>

        {/* ── SECTION 3: Shipping Method ── */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={3} icon={Truck} title="Shipping Method" />
          {isLoadingShipping ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Finding delivery options...</p>
            </div>
          ) : shippingMethods.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {shippingMethods.map((option) => {
                const isSelected = shippingId === option.id;
                const Icon = shippingIcon(option.name);
                return (
                  <button
                    key={option.id}
                    onClick={() => setShippingId(option.id)}
                    className={`flex flex-col items-start gap-1.5 px-3 py-3 rounded-xl border text-left transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-bold text-foreground leading-tight">{option.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{option.description || option.estimatedDays || ""}</p>
                    <p className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>{Number(option.fee) === 0 ? "FREE" : format(Number(option.fee))}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center gap-2 border-2 border-dashed border-border rounded-xl">
              <MapPin className="w-6 h-6 text-muted-foreground/40" />
              <p className="text-xs font-bold text-foreground">No shipping available</p>
              <p className="text-[11px] text-muted-foreground">Enter your country and city above to see delivery options.</p>
            </div>
          )}
        </div>

        {/* ── SECTION 4: Payment Method ── */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={4} icon={CreditCard} title="Payment Method" />

          {hasPaymentError && (
            <div className="p-3 mb-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-900/30 text-[11px] text-red-600 dark:text-red-300 flex items-start gap-2">
              <X className="w-3 h-3 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">{mmPhase === "timed_out" ? "We couldn't confirm your payment in time." : "We couldn't initialize your payment."}</p>
                <p>{orderError || "Please try again, or choose a different payment method."}</p>
              </div>
            </div>
          )}

          {mmPhase === "waiting" && (
            <div className="p-3 mb-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-700 dark:text-amber-200 flex items-start gap-2">
              <Clock className="w-3 h-3 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Waiting for your mobile money payment…</p>
                <p>Check your phone and approve the payment prompt. This can take up to 3 minutes.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-1">
            {activeCheckoutMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = openMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => { setOpenMethod(method.id); setOrderError(null); setMmPhase("idle"); }}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${method.iconBg}`}><Icon /></div>
                  <p className="text-[11px] font-bold text-foreground leading-tight">{method.label.replace(" Payment", "")}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{method.id === "mobile" ? mobileNetworks.slice(0, 2).join(", ") : method.sub}</p>
                </button>
              );
            })}
          </div>

          {/* Inline expansion panel — opens directly under the selected method, matching the reference's intent */}
          {openMethod && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">

              {/* MOBILE MONEY — inline fields */}
              {openMethod === "mobile" && (
                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Provider</label>
                    <button type="button" onClick={() => setShowProviderDrop((v) => !v)} className="w-full flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-3 bg-background hover:border-primary/50 transition-colors">
                      <Smartphone className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm font-semibold text-foreground text-left">{mmProvider}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${showProviderDrop ? "rotate-180" : ""}`} />
                    </button>
                    {showProviderDrop && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                        {mobileNetworks.map((name) => (
                          <button key={name} type="button" onClick={() => { setMmProvider(name); setShowProviderDrop(false); }} className={`w-full flex items-center px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 ${mmProvider === name ? "bg-primary/5" : ""}`}>
                            <span className={`text-sm font-semibold flex-1 ${mmProvider === name ? "text-primary" : "text-foreground"}`}>{name}</span>
                            {mmProvider === name && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Mobile Money Number</label>
                    <div className="flex items-center gap-2 border border-border rounded-xl px-3.5 py-3 bg-background focus-within:ring-2 focus-within:ring-primary/30">
                      <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <input value={mmPhone} onChange={(e) => setMmPhone(e.target.value)} placeholder="Enter the number to charge" type="tel" className="flex-1 text-sm text-foreground outline-none bg-transparent" />
                    </div>
                  </div>
                  <div className="bg-primary/5 border border-primary/15 rounded-xl px-3.5 py-2.5">
                    <p className="text-[11px] text-muted-foreground">A payment prompt will be sent to this number. Please approve it to complete the payment.</p>
                  </div>
                </div>
              )}

              {/* CARD PAYMENT — inline fields */}
              {openMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Card Number</label>
                    <div className="flex items-center gap-2 border border-border rounded-xl px-3.5 py-3 bg-background focus-within:ring-2 focus-within:ring-primary/30">
                      <input value={cardNum} onChange={(e) => setCardNum(e.target.value)} placeholder="1234 5678 9012 3456" inputMode="numeric" className="flex-1 text-sm text-foreground outline-none bg-transparent" />
                      <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Expiry Date</label>
                      <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM / YY" className="w-full border border-border rounded-xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">CVV</label>
                      <input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" type="password" className="w-full border border-border rounded-xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Cardholder Name</label>
                    <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="John Doe" className="w-full border border-border rounded-xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                  </div>
                </div>
              )}

              {/* BANK TRANSFER — inline fields */}
              {openMethod === "bank" && (
                <div className="space-y-3">
                  <div className="bg-primary/5 border border-primary/15 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-muted-foreground">Transfer the exact amount to the account below and use your reference as payment note.</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      ...(bankProviders.length > 0
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
                      { label: "Reference", val: bankRef },
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
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl py-5 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-colors" onClick={() => fileRef.current?.click()}>
                      <Upload className="w-5 h-5 text-muted-foreground mb-2" />
                      <p className="text-xs font-semibold text-foreground">{proofFile ?? "Choose File or Drag & Drop"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, PDF up to 10MB</p>
                      <input ref={fileRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setProofFile(e.target.files?.[0]?.name ?? null)} />
                    </label>
                  </div>
                </div>
              )}

              {/* WHATSAPP — inline confirmation copy */}
              {openMethod === "whatsapp" && (
                <div className="flex flex-col items-center py-4 gap-2.5">
                  <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-600" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center text-muted-foreground px-4">You'll be redirected to WhatsApp to confirm your payment with our team.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 5: Order Summary ── */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={5} icon={Package} title="Order Summary" />
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-semibold text-foreground flex-shrink-0">{format(item.price * item.qty)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border mt-4 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold text-foreground">{format(SUBTOTAL)}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Shipping</span><span className="font-semibold text-foreground">{shippingPrice === 0 ? "FREE" : format(shippingPrice)}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Fee (2%)</span><span className="font-semibold text-foreground">{format(PROCESSING_FEE)}</span></div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-base font-black">
              <span className="text-foreground">Total</span><span className="text-primary">{format(total)}</span>
            </div>
          </div>
        </div>

        <SecureFooter />
      </div>

      {/* Pinned Pay Now button */}
      <div className="sticky bottom-0 px-4 py-4 border-t border-border bg-background/95 backdrop-blur">
        <button
          onClick={() => {
            if (openMethod === "mobile") handleMobileMoneyPay();
            else handlePlaceOrder();
          }}
          disabled={isSubmitting || !openMethod || cartItems.length === 0}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {mmPhase === "initializing" ? "Sending prompt…" : "Processing…"}
            </>
          ) : (
            <><Lock className="w-4 h-4" /> Pay Now</>
          )}
        </button>
      </div>
    </div>
  );
}
