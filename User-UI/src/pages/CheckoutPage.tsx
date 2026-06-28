import { useState, useRef, useEffect, useMemo } from "react";
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
  Mail,
  Phone,
  Home,
  X,
  CreditCard,
  Building2,
} from "lucide-react";

const DIAL_CODES = ["+260", "+263", "+27", "+254", "+234", "+233", "+255", "+256", "+265", "+258", "+267", "+264", "+250", "+251", "+243", "+237", "+221", "+225", "+244", "+44", "+1", "+49", "+33", "+86", "+91", "+61", "+971"];

interface PaymentConfigNetwork {
  id: string;
  name: string;
  isEnabled: boolean;
}

interface PaymentConfigProvider {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  config?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  };
  networks: PaymentConfigNetwork[];
}

interface PaymentConfigMethod {
  id: string;
  name: string;
  type: string;
  icon?: string;
  isEnabled: boolean;
  providers: PaymentConfigProvider[];
}

interface MobileOption {
  label: string;
  providerName: string;
  networkName: string;
}

function isWhatsAppMethod(method: Pick<PaymentConfigMethod, "type" | "name" | "icon" | "providers">) {
  const searchable = [
    method.type,
    method.name,
    method.icon,
    ...method.providers.map((provider) => provider.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return method.type === "whatsapp" || searchable.includes("whatsapp");
}

function getMethodSummary(method: PaymentConfigMethod) {
  const names = method.providers
    .flatMap((provider) => {
      const enabledNetworks = provider.networks?.filter((network) => network.isEnabled) || [];
      if (enabledNetworks.length > 0) return enabledNetworks.map((network) => network.name);
      return [provider.name];
    })
    .filter(Boolean);

  if (names.length > 0) return names.slice(0, 2).join(", ");
  if (isWhatsAppMethod(method)) return "Pay on WhatsApp";
  if (method.type === "bank") return "Bank transfer";
  if (method.type === "card") return "Card payment";
  if (method.type === "cash") return "Cash payment";
  return "Payment method";
}

function MethodIcon({ method }: { method: PaymentConfigMethod }) {
  if (isWhatsAppMethod(method)) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-600" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.788-1.653-2.086-.173-.298-.018-.459.13-.608.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.208-.242-.58-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.413.248-.695.248-1.291.173-1.413-.074-.123-.272-.198-.57-.347M11.886 3.004h.009c2.62 0 5.077 1.02 6.928 2.872 1.845 1.851 2.861 4.304 2.859 6.92-.004 5.394-4.394 9.78-9.79 9.78-1.676-.003-3.32-.428-4.78-1.236L3 21l.664-3.872a9.76 9.76 0 01-1.32-4.86c.003-5.39 4.394-9.78 9.78-9.78m0-2.004C5.322.999.5 5.82.498 12.135c0 2.19.576 4.326 1.668 6.2L.057 24l5.792-2.078a11.87 11.87 0 006.04 1.63h.005c6.313 0 11.44-5.128 11.445-11.438.003-3.06-1.187-5.94-3.346-8.104A11.43 11.43 0 0011.886.999z" />
      </svg>
    );
  }

  if (method.type === "card") return <CreditCard className="w-4 h-4 text-blue-600" />;
  if (method.type === "bank") return <Building2 className="w-4 h-4 text-slate-600" />;
  return <Smartphone className="w-4 h-4 text-primary" />;
}

function getMethodIconBg(method: PaymentConfigMethod) {
  if (isWhatsAppMethod(method)) return "bg-green-50";
  if (method.type === "card") return "bg-blue-50";
  if (method.type === "bank") return "bg-slate-50";
  return "bg-primary/10";
}

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

function buildShortOrderReference(rawValue?: string | null) {
  const clean = rawValue?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!clean) return "ORD-UNKNOWN";
  return `ORD-${clean.slice(-6)}`;
}

function looksLikeInternalOrderId(value?: string | null) {
  return !!value && (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
    value.length > 24
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

  // Shipping Information
  const [firstName,     setFirstName]     = useState(authUser?.firstName ?? "");
  const [lastName,      setLastName]      = useState(authUser?.lastName ?? "");
  const [email,         setEmail]         = useState(authUser?.email ?? "");
  const [phone,         setPhone]         = useState("");
  const [dialCode,      setDialCode]      = useState("+260");
  const [showDialDrop,  setShowDialDrop]  = useState(false);
  const [country,      setCountry]     = useState("");
  const [state,        setState]       = useState("");
  const [city,         setCity]        = useState("");
  const [addressLine,  setAddressLine] = useState("");
  const [zipCode,      setZipCode]     = useState("");

  // Pickup Station
  const [pickupStations, setPickupStations] = useState<PickupStation[]>([]);
  const [pickupStationId, setPickupStationId] = useState("");
  const [loadingStations, setLoadingStations] = useState(false);
  const [showStationDrop, setShowStationDrop] = useState(false);

  // Payment Methods (Dynamic)
  const [activeMethods, setActiveMethods] = useState<PaymentConfigMethod[]>([]);
  const [openMethod, setOpenMethod] = useState<string | null>(null);
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [mmProvider, setMmProvider] = useState("");
  const [mmPhone, setMmPhone] = useState("");
  const [mobileOptions, setMobileOptions] = useState<MobileOption[]>([]);

  const SUBTOTAL = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const [feeRate, setFeeRate] = useState(0.03);
  const PROCESSING_FEE = SUBTOTAL * feeRate;
  const shippingPrice = cartItems.reduce((t, i) => t + (i.shippingFee || 0) * i.qty, 0);
  const total = SUBTOTAL + PROCESSING_FEE + shippingPrice;

  const deliveryMinDays = cartItems.reduce((max, i) => Math.max(max, i.estimatedDeliveryMinDays || 2), 0) || 2;
  const deliveryMaxDays = cartItems.reduce((max, i) => Math.max(max, i.estimatedDeliveryMaxDays || 7), 0) || 7;
  const deliveryRangeText = deliveryMinDays === deliveryMaxDays ? `Delivery in ${deliveryMaxDays} days` : `Delivery in ${deliveryMinDays}-${deliveryMaxDays} days`;
  const shippingDisplayText = shippingPrice <= 0 ? "Free shipping" : `${format(shippingPrice)} shipping`;
  const shippingSummaryText = shippingPrice <= 0 ? "Free shipping" : format(shippingPrice);
  const placedOrderDisplay = placedOrderNumber
    ? looksLikeInternalOrderId(placedOrderNumber)
      ? `#${buildShortOrderReference(placedOrderNumber)}`
      : `#${placedOrderNumber}`
    : "#—";

  useEffect(() => {
    fetch(`${API_BASE}/api/countries`).then(r => r.json()).then(data => {
      const raw = Array.isArray(data?.data) ? data.data : data;
      const mapped = raw.map((c: any) => ({ name: c.name, code: c.code, shippingEnabled: c.shippingEnabled !== false, isActive: c.isActive !== false }));
      setShippingCountries(mapped);
      const def = mapped.find((c: any) => c.isActive && c.shippingEnabled);
      if (def && !country) setCountry(def.name);
    }).catch(() => setShippingCountries([{ name: 'Zambia', code: 'ZM', shippingEnabled: true, isActive: true }]));

    fetch(`${API_BASE}/api/pickup-stations?active=true`).then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setPickupStations(list.filter((s: any) => s.isActive !== false).map(normalizePickupStation));
    }).catch(() => {});

    fetch(`${API_BASE}/api/payment-config/public`).then(r => r.json()).then(data => {
      const arr = (Array.isArray(data) ? data : data?.data ?? []) as PaymentConfigMethod[];
      const methods = arr.filter((method) => method?.isEnabled !== false);
      setActiveMethods(methods);
      setOpenMethod((current) => methods.some((method) => method.type === current) ? current : methods[0]?.type ?? null);

      const mobileMethod = methods.find((method) => method.type === "mobile_wallet");
      const options = (mobileMethod?.providers ?? []).flatMap((provider) => {
        const enabledNetworks = (provider.networks ?? []).filter((network) => network.isEnabled);
        if (enabledNetworks.length > 0) {
          return enabledNetworks.map((network) => ({
            label: network.name.replace(/ Mobile Money/i, ""),
            providerName: provider.name,
            networkName: network.name,
          }));
        }

        return [{
          label: provider.name,
          providerName: provider.name,
          networkName: provider.name,
        }];
      });

      setMobileOptions(options);
      setMmProvider((current) => options.some((option) => option.label === current) ? current : options[0]?.label || "");
    }).catch(() => {
      setActiveMethods([]);
      setMobileOptions([]);
      setOpenMethod(null);
    });

    fetchSettings().then(s => {
      const arr = Array.isArray(s) ? s : (s as any)?.data || [];
      const rate = arr.find((i: any) => i.key === 'processing_fee_rate')?.value;
      if (rate) setFeeRate(Number(rate) / 100);
      const wa = arr.find((i: any) => i.key === 'whatsapp_number')?.value;
      if (wa) setWhatsappNumber(wa.replace(/[^0-9]/g, ""));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setOrderError(null);
    setMmPhase("idle");
    setShowProviderDrop(false);
  }, [openMethod]);

  const [shippingCountries, setShippingCountries] = useState<any[]>([]);

  const buildTrackingPath = (orderNumber: string) => {
    const params = new URLSearchParams({ orderNumber });
    if (email.trim()) params.set("email", email.trim());
    return `/track?${params.toString()}`;
  };

  const buildTrackingUrl = (orderNumber: string) => {
    if (typeof window === "undefined") return buildTrackingPath(orderNumber);
    return `${window.location.origin}${buildTrackingPath(orderNumber)}`;
  };

  const selectedMethod = useMemo(
    () => activeMethods.find((method) => method.type === openMethod) ?? null,
    [activeMethods, openMethod]
  );

  const selectedMobileOption = useMemo(
    () => mobileOptions.find((option) => option.label === mmProvider) ?? mobileOptions[0],
    [mobileOptions, mmProvider]
  );

  const getBackendPaymentMethod = (methodType: string | null) => {
    if (methodType === "mobile_wallet") return "MOBILE_MONEY";
    if (isWhatsAppMethod({ type: methodType || "", name: selectedMethod?.name || "", icon: selectedMethod?.icon, providers: selectedMethod?.providers || [] })) return "WHATSAPP";
    if (methodType === "bank") return "BANK_TRANSFER";
    if (methodType === "card") return "CARD";
    if (methodType === "cash") return "CASH";
    if (methodType === "digital_wallet") return "DIGITAL_WALLET";
    return "CARD";
  };

  const buildOrderPayload = (backendPaymentMethod: string, totalZMW: number) => ({
    items: cartItems.map((item) => ({ productId: item.id, quantity: item.qty })),
    paymentMethod: backendPaymentMethod,
    ...(openMethod === "mobile_wallet" && mmPhone ? { paymentPhone: mmPhone } : {}),
    totalZMW: Math.round(totalZMW * 100) / 100,
    currencyCode: selectedCurrency.code,
    currencySymbol: selectedCurrency.symbol,
    exchangeRate: selectedCurrency.exchangeRate,
    ...(openMethod === "mobile_wallet" && selectedMobileOption ? { notes: `Provider: ${selectedMobileOption.providerName} | Network: ${selectedMobileOption.networkName}` } : {}),
    addressDetails: {
      email, firstName, lastName, phone: `${dialCode}${phone}`,
      address: addressLine || `${city}, ${state}, ${country}`,
      zipCode: zipCode || undefined,
      countryName: country, stateName: state || undefined, cityName: city || undefined, manual: true,
      pickupStationId: pickupStationId || undefined,
    },
  });

  const validateShippingInfo = () => {
    if (!firstName.trim() || !lastName.trim() || !country || !city.trim() || !addressLine.trim()) {
      toast.error("Please fill in all shipping details");
      return false;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Please provide email or phone for notifications");
      return false;
    }
    return true;
  };

  const handleMobileMoneyPay = async () => {
    if (isSubmitting || !mmPhone.trim() || !validateShippingInfo()) return;
    setIsSubmitting(true); setOrderError(null);
    try {
      const headers = { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };
      const totalLocal = total * (selectedCurrency.exchangeRate || 1);
      const res = await fetch(`${API_BASE}/api/orders`, { method: "POST", headers, body: JSON.stringify(buildOrderPayload("MOBILE_MONEY", totalLocal)) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to place order");
      
      const orderId = data.id;
      setPlacedOrderId(orderId);
      setSavedCartItems([...cartItems]);
      setMmPhase("initializing");
      
      const initRes = await fetch(`${API_BASE}/api/payments/initialize`, { method: "POST", headers, body: JSON.stringify({ orderId, phone: `260${mmPhone.replace(/^0/, "")}`, amount: Math.round(totalLocal * 100) / 100 }) });
      if (!initRes.ok) throw new Error("Payment init failed");
      
      setMmPhase("waiting");
      startPolling(orderId, data.orderNumber || orderId);
    } catch (err: any) { setOrderError(err.message); toast.error(err.message); }
    finally { setIsSubmitting(false); }
  };

  const startPolling = (orderId: string, orderNum: string) => {
    const headers = { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      if (++attempts > 36) { clearInterval(pollRef.current!); setMmPhase("timed_out"); return; }
      try {
        const r = await fetch(`${API_BASE}/api/payments/status/${orderId}`, { headers });
        const d = await r.json();
        if (d.status?.toLowerCase() === "paid") {
          clearInterval(pollRef.current!); setPlacedOrderNumber(orderNum); clearCart(); setOrdered(true); setMmPhase("idle");
        } else if (d.status?.toLowerCase() === "failed") {
          clearInterval(pollRef.current!); setMmPhase("failed_init");
        }
      } catch {}
    }, 5000);
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting || cartItems.length === 0 || !validateShippingInfo()) return;
    setIsSubmitting(true); setOrderError(null);
    try {
      const headers = { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };
      const totalLocal = total * (selectedCurrency.exchangeRate || 1);
      const res = await fetch(`${API_BASE}/api/orders`, { method: "POST", headers, body: JSON.stringify(buildOrderPayload(getBackendPaymentMethod(openMethod), totalLocal)) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      
      const orderNum = data.orderNumber || data.id;
      setPlacedOrderNumber(orderNum); setPlacedOrderId(data.id); setSavedCartItems([...cartItems]);
      
      if (selectedMethod && isWhatsAppMethod(selectedMethod)) {
        const msg = encodeURIComponent(`*New Order:* ${orderNum}\n*Customer:* ${firstName} ${lastName}\n*Total:* ${format(total)}\n*Track:* ${buildTrackingUrl(orderNum)}`);
        setWaMessage(msg); setOrdered(true); clearCart();
        window.open(`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${msg}`, "_blank");
      } else {
        setOrdered(true); clearCart();
      }
    } catch (err: any) { setOrderError(err.message); toast.error(err.message); }
    finally { setIsSubmitting(false); }
  };

  if (ordered) {
    const trackingPath = placedOrderNumber ? buildTrackingPath(placedOrderNumber) : "/track";
    return (
      <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col px-6 pt-12 pb-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Check className="w-10 h-10 text-primary" strokeWidth={3} /></div>
        <h1 className="text-2xl font-black">Order Placed!</h1>
        <p className="text-sm text-muted-foreground">Order: <span className="font-bold text-foreground">{placedOrderDisplay}</span></p>
        <div className="bg-card border border-border rounded-3xl p-5 space-y-3">
          {savedCartItems.map(i => <div key={i.id} className="flex justify-between text-sm"><span>{i.qty}× {i.name}</span><span className="font-semibold">{format(i.price * i.qty)}</span></div>)}
          <div className="pt-3 border-t font-black flex justify-between"><span>Total</span><span className="text-primary">{format(total)}</span></div>
        </div>
        <div className="space-y-3">
          {selectedMethod && isWhatsAppMethod(selectedMethod) && <button onClick={() => window.open(`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${waMessage}`, "_blank")} className="w-full py-4 bg-primary text-white rounded-2xl font-bold">Open WhatsApp</button>}
          <Link href={trackingPath}><button className="w-full py-3 rounded-2xl border border-primary/30 text-primary font-semibold">Track Payment</button></Link>
          <Link href="/"><button className="w-full py-3 rounded-2xl border border-border font-semibold">Continue Shopping</button></Link>
        </div>
      </div>
    );
  }

  const selectedStation = pickupStations.find(s => s.id === pickupStationId);

  return (
    <div className="max-w-lg mx-auto bg-background min-h-screen flex flex-col">
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-5 pb-3 bg-background/90 backdrop-blur border-b border-border/60">
        <button onClick={() => navigate("/cart")} className="flex items-center gap-1.5 text-xs text-muted-foreground"><ChevronLeft className="w-4 h-4" /> Back</button>
        <span className="text-base font-bold absolute left-1/2 -translate-x-1/2">Checkout</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary"><Lock className="w-3 h-3" /> Secure</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={1} icon={User} title="Shipping Information" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" className="w-full px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" className="w-full px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Phone Number</label>
              <div className="flex gap-1.5">
                <div className="relative w-20 flex-shrink-0">
                  <input
                    value={dialCode}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val && !val.startsWith("+")) val = "+" + val.replace(/[^0-9]/g, "");
                      setDialCode(val);
                    }}
                    onFocus={() => setShowDialDrop(true)}
                    onBlur={() => setTimeout(() => setShowDialDrop(false), 200)}
                    placeholder="+260"
                    className="w-full px-2 py-3 rounded-xl border bg-muted/40 text-sm font-bold outline-none text-center"
                  />
                  {showDialDrop && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-background border border-border rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                      {DIAL_CODES.map(code => (
                        <button key={code} onClick={() => { setDialCode(code); setShowDialDrop(false); }} className="w-full px-3 py-2.5 text-sm font-bold hover:bg-muted text-center border-b last:border-0">{code}</button>
                      ))}
                    </div>
                  )}
                </div>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" className="flex-1 px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">Email Address</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">Street Address</label><input value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="Street Address" className="w-full px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">City</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="w-full px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">State</label><input value={state} onChange={e => setState(e.target.value)} placeholder="State" className="w-full px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">Postal Code</label><input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Postal Code" className="w-full px-3.5 py-3 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div className="space-y-1"><label className="text-[11px] font-semibold text-muted-foreground">Country</label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-[46px] rounded-xl border-border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-border">{shippingCountries.map(c => <SelectItem key={c.code} value={c.name} disabled={!c.isActive || !c.shippingEnabled}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={2} icon={Package} title="Pickup Station" />
          <button onClick={() => setShowStationDrop(!showStationDrop)} className="w-full flex items-center justify-between border rounded-xl px-3.5 py-3 bg-background text-sm">
            <span className={selectedStation ? "font-semibold" : "text-muted-foreground"}>{selectedStation ? selectedStation.name : "Choose Pickup Station"}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showStationDrop ? "rotate-180" : ""}`} />
          </button>
          {showStationDrop && (
            <div className="mt-1 border rounded-xl bg-background shadow-xl overflow-hidden max-h-56 overflow-y-auto">
              <button onClick={() => { setPickupStationId(""); setShowStationDrop(false); }} className="w-full px-4 py-3 text-left hover:bg-muted border-b text-sm text-muted-foreground">No pickup station</button>
              {pickupStations.map(s => <button key={s.id} onClick={() => { setPickupStationId(s.id); setShowStationDrop(false); }} className={`w-full px-4 py-3 text-left hover:bg-muted border-b last:border-0 ${pickupStationId === s.id ? "bg-primary/5 font-semibold text-primary" : ""}`}>{s.name}</button>)}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={3} icon={Truck} title="Delivery" />
          <div className="flex items-center gap-3"><Truck className="w-6 h-6 text-primary" /><div><p className="text-sm font-bold text-primary">{shippingDisplayText}</p><p className="text-xs font-semibold">{deliveryRangeText}</p></div></div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <SectionHeader number={4} icon={Smartphone} title="Payment Method" />
          {activeMethods.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {activeMethods.map((method) => (
                <button key={method.id} onClick={() => setOpenMethod(method.type)} className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all ${openMethod === method.type ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${getMethodIconBg(method)}`}>
                    <MethodIcon method={method} />
                  </div>
                  <span className="text-[11px] font-bold text-center">{method.name}</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-0.5">{getMethodSummary(method)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground mb-4">
              No payment methods are enabled in the admin panel yet.
            </div>
          )}

          {openMethod === "mobile_wallet" && (
            <div className="space-y-3 pt-2">
              <div className="relative"><button onClick={() => setShowProviderDrop(!showProviderDrop)} className="w-full flex justify-between items-center px-4 py-3 border rounded-xl bg-background text-sm font-semibold">{selectedMobileOption?.label || "Select network"}<ChevronDown className={`w-4 h-4 transition-transform ${showProviderDrop ? "rotate-180" : ""}`} /></button>
                {showProviderDrop && <div className="absolute top-full w-full mt-1 border rounded-xl bg-background shadow-xl z-10">{mobileOptions.map(option => <button key={`${option.providerName}-${option.networkName}`} onClick={() => { setMmProvider(option.label); setShowProviderDrop(false); }} className="w-full px-4 py-3 text-left hover:bg-muted border-b last:border-0"><div className="flex items-center justify-between gap-2"><span>{option.label}</span><span className="text-xs text-muted-foreground">{option.providerName}</span></div></button>)}</div>}
              </div>
              {selectedMobileOption && <div className="rounded-xl border border-border bg-background px-3.5 py-3 text-xs text-muted-foreground">Provider: <span className="font-semibold text-foreground">{selectedMobileOption.providerName}</span></div>}
              <div className="flex gap-2"><div className="w-14 flex items-center justify-center border rounded-xl bg-muted/40 text-sm font-bold">+260</div><input value={mmPhone} onChange={e => setMmPhone(e.target.value)} placeholder="97XXXXXXX" className="flex-1 px-3.5 py-2.5 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <button onClick={handleMobileMoneyPay} disabled={isSubmitting || !mmPhone.trim() || !selectedMobileOption} className="w-full py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">{isSubmitting ? "Processing..." : `Pay ${format(total)}`}</button>
            </div>
          )}
          {selectedMethod && isWhatsAppMethod(selectedMethod) && <button onClick={handlePlaceOrder} disabled={isSubmitting} className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20">{isSubmitting ? "Processing..." : "Pay via WhatsApp"}</button>}
          {selectedMethod && !isWhatsAppMethod(selectedMethod) && openMethod !== "mobile_wallet" && <button onClick={handlePlaceOrder} disabled={isSubmitting} className="w-full py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">{isSubmitting ? "Processing..." : `Pay ${format(total)}`}</button>}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="font-semibold text-foreground">{format(SUBTOTAL)}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Shipping</span><span className="font-semibold text-foreground">{shippingSummaryText}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Processing Fee (3%)</span><span className="font-semibold text-foreground">{format(PROCESSING_FEE)}</span></div>
          <div className="pt-2.5 border-t flex justify-between items-center font-black"><span>Total</span><span className="text-lg text-primary">{format(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
