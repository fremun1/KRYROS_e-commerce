import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { API_BASE, fetchSettings } from "@/lib/api";
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
  Smartphone,
  Lock,
  ChevronLeft,
  Truck,
  User,
  MapPin,
  Globe,
  ChevronDown,
  Package,
  X,
} from "lucide-react";

const DEFAULT_CHECKOUT_METHODS = [
  { id: "mobile",   label: "Mobile Money",   sub: "MTN, Airtel, Zamtel",       icon: Smartphone, iconBg: "bg-primary/10" },
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
  const [whatsappNumber, setWhatsappNumber] = useState(import.meta.env.VITE_WHATSAPP_NUMBER || "260969597029");

  // Simplified Shipping Information (Section 1)
  const [firstName,     setFirstName]     = useState(authUser?.firstName ?? "");
  const [lastName,      setLastName]      = useState(authUser?.lastName ?? "");
  const [country,      setCountry]     = useState("");
  const [state,        setState]       = useState("");

  // Pickup Station (Section 2)
  const [pickupStations, setPickupStations] = useState<PickupStation[]>([]);
  const [pickupStationId, setPickupStationId] = useState("");
  const [loadingStations, setLoadingStations] = useState(false);
  const [showStationDrop, setShowStationDrop] = useState(false);

  const SUBTOTAL = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const DISCOUNT = 0;
  const [feeRate, setFeeRate] = useState(0.03); // default 3%
  const PROCESSING_FEE = SUBTOTAL * feeRate;
  const shippingPrice = cartItems.reduce((t, i) => t + (i.shippingFee || 0) * i.qty, 0);
  const deliveryMinDays = cartItems.reduce(
    (max, i) => Math.max(max, i.estimatedDeliveryMinDays || i.estimatedDeliveryDays || 2),
    0,
  ) || 2;
  const deliveryMaxDays = cartItems.reduce(
    (max, i) => Math.max(max, i.estimatedDeliveryMaxDays || i.estimatedDeliveryDays || 7),
    0,
  ) || 7;
  const today = new Date();
  const estimatedStart = new Date(today);
  estimatedStart.setDate(today.getDate() + deliveryMinDays);
  const estimatedEnd = new Date(today);
  estimatedEnd.setDate(today.getDate() + deliveryMaxDays);
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  const deliveryRangeText = deliveryMinDays === deliveryMaxDays
    ? `Delivery in ${deliveryMaxDays} day${deliveryMaxDays === 1 ? "" : "s"}`
    : `Delivery in ${deliveryMinDays}-${deliveryMaxDays} days`;
  const total = SUBTOTAL - DISCOUNT + PROCESSING_FEE + shippingPrice;

  const [openMethod,       setOpenMethod]       = useState<string | null>("mobile");
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [mmProvider, setMmProvider] = useState("MTN");
  const [mmPhone,   setMmPhone]   = useState("");

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

  const [mobileNetworks, setMobileNetworks] = useState<string[]>(["MTN", "Airtel", "Zamtel", "M-Pesa"]);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-config/public`)
      .then((r) => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : data?.data ?? [];
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
      })
      .catch(() => {});

    fetchSettings()
      .then((settings) => {
        const arr = Array.isArray(settings) ? settings : (settings as any)?.data || [];
        const rate = arr.find((s: any) => s.key === 'processing_fee_rate')?.value;
        if (rate) setFeeRate(Number(rate) / 100);
        const wa = arr.find((s: any) => s.key === 'whatsapp_number')?.value;
        if (wa && wa.trim()) setWhatsappNumber(wa.replace(/[^0-9]/g, ""));
      })
      .catch(() => {});
  }, []);

  const activeCheckoutMethods = [...DEFAULT_CHECKOUT_METHODS];

  const buildTrackingPath = (orderNumber: string) => {
    const params = new URLSearchParams({ orderNumber });
    return `/track?${params.toString()}`;
  };

  const buildTrackingUrl = (orderNumber: string) => {
    if (typeof window === "undefined") return buildTrackingPath(orderNumber);
    return `${window.location.origin}${buildTrackingPath(orderNumber)}`;
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
    ...(openMethod === "mobile" && mmProvider ? { notes: `Mobile money provider: ${mmProvider}` } : {}),
    addressDetails: {
      firstName, lastName,
      address: `${state}, ${country}`,
      countryName: country, stateName: state || undefined, manual: true,
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
        const status = String(d.status ?? d.paymentStatus ?? "").toLowerCase();
        if (status === "paid") {
          clearInterval(pollRef.current!);
          setPlacedOrderNumber(orderNum);
          clearCart();
          setOrdered(true);
          setMmPhase("idle");
        } else if (status === "failed") {
          clearInterval(pollRef.current!);
          setMmPhase("failed_init");
        }
      } catch { /* ignore */ }
    }, 5000);
  };

  const validateShippingInfo = () => {
    if (!firstName.trim()) { toast.error("Please enter your first name"); return false; }
    if (!lastName.trim())  { toast.error("Please enter your last name");  return false; }
    if (!country) { toast.error("Please select a country"); return false; }
    if (!state.trim()) { toast.error("Please enter your province / state"); return false; }
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
        const initRes = await fetch(`${API_BASE}/api/payments/initialize`, { method: "POST", headers, body: JSON.stringify({ orderId, phone: `260${mmPhone.replace(/^0/, "")}`, amount: Math.round(totalLocal * 100) / 100 }) });
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
      const PAYMENT_METHOD_MAP: Record<string, string> = { whatsapp: "WHATSAPP" };
      const backendPaymentMethod = PAYMENT_METHOD_MAP[openMethod ?? "whatsapp"] ?? "WHATSAPP";
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
        const deliveryText = pickupStationId
          ? `Pickup Station: ${selectedStation?.name || "Selected pickup station"}`
          : `Delivery: ${state}, ${country}`;
        const msg =
          `*New Order:* ${orderNum}\n\n` +
          `*Customer:* ${firstName} ${lastName}\n\n` +
          `*Item:* ${itemsList.replace(/• /g, "")}\n` +
          `*Total:* ${format(total)}\n\n` +
          `*Payment:* WhatsApp Payment\n` +
          `*Delivery:* ${deliveryText}\n\n` +
          `*Track:* ${buildTrackingUrl(orderNum)}\n\n` +
          `Order placed. Please confirm the next step.`;
        setWaMessage(msg);
        setOrdered(true);
        clearCart();
        const url = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
      } else {
        setOrdered(true);
        clearCart();
      }
    } catch {
      const msg = "Network error. Please check your connection and try again.";
      setOrderError(msg);
      toast.error(msg);
    } finally { setIsSubmitting(false); }
  };

  const handleWhatsAppRedirect = () => {
    const url = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank");
  };

  if (ordered) {
    const isManual = openMethod === "whatsapp";
    const trackingPath = placedOrderNumber ? buildTrackingPath(placedOrderNumber) : "/track";
    return (
      <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col px-6 pt-12 pb-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
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
                <span>{isManual ? "Total Due" : "Total Paid"}</span>
                <span className="text-primary">{format(total)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 w-full">
            <p className="text-sm text-muted-foreground px-4">
              {isManual
                ? "Your order has been created. We’ve sent your invoice/order summary, and your receipt will be sent after we verify your WhatsApp payment."
                : `Thank you${firstName ? `, ${firstName}` : ""}! Your payment is verified. Your receipt will be sent automatically.`}
            </p>
            {isManual && (
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 text-xs text-primary font-medium">
                Open WhatsApp below to send your payment request. Use the tracking link to check payment status any time, even if you leave this page.
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
          <Link href={trackingPath}>
            <button className="w-full py-3 rounded-2xl border border-primary/30 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
              Track Payment
            </button>
          </Link>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl border border-border bg-background text-sm font-semibold hover:bg-primary/5 transition-colors">Continue Shopping</button>
          </Link>
        </div>
      </div>
    );
  }

  const hasPaymentError = !!orderError || mmPhase === "failed_init" || mmPhase === "timed_out";
  const selectedStation = pickupStations.find((s) => s.id === pickupStationId);

  return (
    <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col">
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-5 pb-3 bg-background/90 backdrop-blur border-b border-border/60">
        <button onClick={() => navigate("/cart")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </button>
        <span className="text-base font-bold text-foreground absolute left-1/2 -translate-x-1/2">Checkout</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
          <Lock className="w-3 h-3" /> Secure Checkout
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><MapPin className="w-3 h-3" />Province / State</label>
                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Enter province / state" className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
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
        </div>

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
                  onClick={() => { setPickupStationId(""); setShowStationDrop(false); }}
                  className="w-full flex items-center px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border text-sm text-muted-foreground"
                >
                  No pickup station (deliver to address)
                </button>
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
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={3} icon={Truck} title="Delivery" />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Truck className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-primary">{format(shippingPrice)} shipping</p>
                <p className="text-xs font-semibold text-foreground mt-1">{deliveryRangeText}</p>
                <p className="text-xs text-foreground mt-0.5">Estimated by {formatDate(estimatedStart)} - {formatDate(estimatedEnd)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={4} icon={Smartphone} title="Payment Method" />
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
              <Smartphone className="w-3 h-3 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Waiting for your mobile money payment…</p>
                <p>Check your phone and approve the payment prompt. This can take up to 3 minutes.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-1">
            {activeCheckoutMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = openMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setOpenMethod(method.id);
                    setOrderError(null);
                    setMmPhase("idle");
                  }}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${method.iconBg}`}><Icon /></div>
                  <p className="text-[11px] font-bold text-foreground leading-tight">{method.label.replace(" Payment", "")}</p>
                </button>
              );
            })}
          </div>

          {openMethod && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
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
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-muted-foreground">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="w-14 h-11 rounded-xl border border-border bg-muted/40 flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">+260</div>
                      <input value={mmPhone} onChange={(e) => setMmPhone(e.target.value)} placeholder="97XXXXXXX" type="tel" className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                    </div>
                  </div>
                  <button onClick={handleMobileMoneyPay} disabled={isSubmitting || !mmPhone.trim()} className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmitting ? "Processing..." : `Pay ${format(total)}`}
                  </button>
                </div>
              )}
              {openMethod === "whatsapp" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                    <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed font-medium">
                      Place your order first, then you will be redirected to WhatsApp to complete payment with our support team.
                    </p>
                  </div>
                  <button onClick={handlePlaceOrder} disabled={isSubmitting} className="w-full py-3.5 bg-[var(--kryros-primary-hover)] text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? "Placing Order..." : `Place Order & Pay via WhatsApp`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">{format(SUBTOTAL)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-semibold text-foreground">{format(shippingPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing Fee (3%)</span>
              <span className="font-semibold text-foreground">{format(PROCESSING_FEE)}</span>
            </div>
            <div className="pt-2.5 border-t border-border flex justify-between items-center">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-lg font-black text-primary">{format(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
