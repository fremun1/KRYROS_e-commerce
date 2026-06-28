import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import { Search, ChevronRight, Headphones, CheckCircle, Truck, MapPin, Loader2, Package, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { fetchOrders, trackOrder, type ApiOrder, API_BASE } from "@/lib/api";
import AccountLayout from "@/components/layout/AccountLayout";

const statusColors: Record<string, string> = {
  "Pending":          "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Processing":       "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Paid":             "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "Shipped":          "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "In Transit":       "bg-primary/10 text-primary border-primary/20",
  "Delivered":        "bg-green-500/10 text-green-600 border-green-500/20",
  "Collected":        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Cancelled":        "bg-red-500/10 text-red-600 border-red-500/20",
  "Refunded":         "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Returned":         "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

const filterTabs = ["All Orders", "Paid", "Shipped", "In Transit", "Delivered", "Collected", "Cancelled"];

const STATUS_MAP: Record<string, string> = {
  PENDING:    "Pending",
  PROCESSING: "Processing",
  CONFIRMED:  "Paid",
  SHIPPED:    "Shipped",
  IN_TRANSIT: "In Transit",
  DELIVERED:  "Delivered",
  COLLECTED:  "Collected",
  CANCELLED:  "Cancelled",
  REFUNDED:   "Refunded",
  RETURNED:   "Returned",
};

function normalizeStatus(s: string): string {
  return STATUS_MAP[s?.toUpperCase?.()] ?? s ?? "Pending";
}

interface DirectPaymentApiResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentNumber: string;
  paymentMethod: string;
  createdAt: string;
  trackingLink?: string;
}

function buildShortReference(prefix: string, rawId?: string | null) {
  const clean = rawId?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!clean) return `${prefix}-UNKNOWN`;
  return `${prefix}-${clean.slice(-6)}`;
}

function formatOrderReference(orderNumber?: string | null, fallbackId?: string | null, trackingNumber?: string | null) {
  if (orderNumber?.trim()) return `#${orderNumber.trim()}`;
  if (trackingNumber?.trim()) return `#${trackingNumber.trim()}`;
  if (fallbackId?.trim()) return `#${buildShortReference("ORD", fallbackId)}`;
  return "#—";
}

function formatDeliveryEstimate(order: ApiOrder) {
  const items = order.items ?? [];
  const minDays = items.reduce((max, item) => {
    const candidate = Number((item as any)?.product?.estimatedDeliveryMinDays ?? (item as any)?.estimatedDeliveryMinDays ?? 0);
    return Math.max(max, candidate);
  }, 0);
  const maxDays = items.reduce((max, item) => {
    const candidate = Number((item as any)?.product?.estimatedDeliveryMaxDays ?? (item as any)?.estimatedDeliveryMaxDays ?? 0);
    return Math.max(max, candidate);
  }, 0);

  if (minDays > 0 || maxDays > 0) {
    const start = minDays || maxDays;
    const end = maxDays || minDays;
    return start === end
      ? `Estimated delivery in ${end} day${end === 1 ? "" : "s"}`
      : `Estimated delivery in ${start}-${end} days`;
  }

  if (order.estimatedDays) {
    return `Estimated delivery in ${order.estimatedDays} day${order.estimatedDays === 1 ? "" : "s"}`;
  }

  return "—";
}

function normalizeDirectPayment(dp: DirectPaymentApiResult): OrderRow {
  const status = getDisplayStatus(dp.status);
  return {
    id: dp.id,
    name: `Direct Payment (${dp.paymentMethod})`,
    specs: `${dp.amount} ${dp.currency}`,
    orderId: `#${dp.paymentNumber}`,
    placedOn: new Date(dp.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }),
    status,
    estDelivery: "—",
    image: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_FALLBACK_IMAGE_URL || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80",
    timeline: getTimeline(status),
    trackingLink: dp.trackingLink || undefined,
  };
}

function getDisplayStatus(status?: string, paymentStatus?: string): string {
  const normalizedStatus = status?.toUpperCase?.() ?? "";
  const normalizedPaymentStatus = paymentStatus?.toUpperCase?.() ?? "";

  if (normalizedStatus === "PROCESSING") return "Processing";
  if (normalizedStatus === "CONFIRMED") return "Paid";
  if (normalizedStatus === "SHIPPED") return "Shipped";
  if (normalizedStatus === "IN_TRANSIT") return "In Transit";
  if (normalizedStatus === "DELIVERED") return "Delivered";
  if (normalizedStatus === "COLLECTED") return "Collected";
  if (normalizedStatus === "CANCELLED") return "Cancelled";
  if (normalizedStatus === "REFUNDED") return "Refunded";
  if (normalizedStatus === "RETURNED") return "Returned";

  if (normalizedPaymentStatus === "PAID") return "Paid";
  if (normalizedPaymentStatus === "PARTIALLY_PAID") return "Processing";
  if (normalizedPaymentStatus === "REFUNDED") return "Refunded";

  return normalizeStatus(status || "PENDING");
}

function getTimeline(status: string) {
  const norm = normalizeStatus(status);
  const steps = [
    { label: "Pending",    threshold: ["Pending","Processing","Paid","Shipped","In Transit","Delivered","Collected"] },
    { label: "Paid",       threshold: ["Paid","Shipped","In Transit","Delivered","Collected"] },
    { label: "Shipped",    threshold: ["Shipped","In Transit","Delivered","Collected"] },
    { label: "In Transit", threshold: ["In Transit","Delivered","Collected"] },
    { label: "Delivered",  threshold: ["Delivered","Collected"] },
    { label: "Collected",  threshold: ["Collected"] },
  ];
  const activeIdx =
    norm === "Collected"  ? 5 :
    norm === "Delivered"  ? 4 :
    norm === "In Transit" ? 3 :
    norm === "Shipped"    ? 2 :
    norm === "Paid"       ? 1 : 0;
  return steps.map((step, i) => ({
    label: step.label,
    done: step.threshold.includes(norm),
    active: i === activeIdx && norm !== "Collected" && norm !== "Cancelled",
  }));
}

interface OrderRow {
  id: string;
  name: string;
  specs: string;
  orderId: string;
  placedOn: string;
  status: string;
  estDelivery: string;
  image: string;
  timeline: { label: string; done: boolean; active: boolean }[];
  trackingLink?: string;
}

function normalizeOrder(o: ApiOrder): OrderRow {
  const item = o.items?.[0];
  const imgRaw = item?.product?.images?.[0];
  const image = item?.image || (typeof imgRaw === "string" ? imgRaw : (imgRaw as any)?.url ?? "");
  const status = getDisplayStatus(o.status, o.paymentStatus);
  return {
    id: String(o.id),
    trackingLink: (o as any).trackingLink || undefined,
    name: item?.product?.name ?? item?.name ?? "Order",
    specs: item?.product?.specs ?? "",
    orderId: formatOrderReference(o.orderNumber, o.id, o.trackingNumber),
    placedOn: o.createdAt
      ? new Date(o.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
      : "",
    status,
    estDelivery: formatDeliveryEstimate(o),
    image: image || (import.meta as unknown as { env: Record<string, string> }).env?.VITE_FALLBACK_IMAGE_URL || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80",
    timeline: getTimeline(status),
  };
}

const STATUS_FILTER_MAP: Record<string, string[]> = {
  "Paid":       ["Paid"],
  "Shipped":    ["Shipped"],
  "In Transit": ["In Transit"],
  "Delivered":  ["Delivered"],
  "Collected":  ["Collected"],
  "Cancelled":  ["Cancelled"],
};

export default function TrackOrderPage() {
  const { token } = useAuthStore();
  const [searchQ, setSearchQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<OrderRow | null>(null);
  const [searchError, setSearchError] = useState("");

  const runTrackLookup = async (query: string, email?: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setTrackedOrder(null);
      setSearchError("");
      return;
    }

    const localMatch = orders.find((order) => {
      const normalizedOrderId = order.orderId.replace(/^#/, "").toLowerCase();
      return normalizedOrderId === cleanQuery.replace(/^#/, "").toLowerCase();
    });

    if (localMatch) {
      setTrackedOrder(localMatch);
    }

    setSearchLoading(true);
    setSearchError("");
    try {
      const result = await trackOrder(cleanQuery, email);
      if (!result) {
        setTrackedOrder(null);
      setSearchError("No order was found for that ID.");
      // Try direct payment lookup if order lookup fails
      try {
        const directPaymentResult = await fetch(`${API_BASE}/api/payments/direct-status/${cleanQuery}`, {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        });
        const directPaymentData = await directPaymentResult.json();

        if (directPaymentResult.ok && directPaymentData) {
          setTrackedOrder(normalizeDirectPayment(directPaymentData));
          return;
        }
      } catch (directPaymentError) {
        console.error("Direct payment lookup error:", directPaymentError);
      }
      return;
      }
      setTrackedOrder(normalizeOrder(result));
    } catch {
      setTrackedOrder(null);
      setSearchError("No order was found for that ID.");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchOrders(token)
      .then((data) => setOrders(data.map(normalizeOrder)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedOrder = params.get("orderNumber") || params.get("order") || "";
    const linkedEmail = params.get("email") || "";
    if (!linkedOrder.trim()) return;
    setSearchQ(linkedOrder);
    runTrackLookup(linkedOrder, linkedEmail);
  }, []);

  const handleTrackOrder = async (event?: FormEvent) => {
    event?.preventDefault();
    await runTrackLookup(searchQ);
  };

  const displayedOrders = trackedOrder ? [trackedOrder] : orders;
  const recentOrder = trackedOrder ?? orders[0] ?? null;

  const filtered = displayedOrders.filter((o) => {
    const allowed = STATUS_FILTER_MAP[activeFilter];
    if (allowed && !allowed.includes(o.status)) return false;
    if (searchQ && !o.orderId.toLowerCase().includes(searchQ.toLowerCase()) && !o.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  return (
    <AccountLayout>
      <h1 className="text-2xl font-black text-foreground mb-0.5">Track Order</h1>
        <p className="text-muted-foreground text-xs mb-5">Stay updated with your order status in real time</p>

        {/* Search */}
        <form className="flex gap-2 mb-2" onSubmit={handleTrackOrder}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter Order ID or Tracking Number"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                if (!e.target.value.trim()) {
                  setTrackedOrder(null);
                  setSearchError("");
                }
              }}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={searchLoading}
            className="px-4 py-3 bg-foreground text-background rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex-shrink-0 disabled:opacity-60"
          >
            {searchLoading ? "Searching..." : "Track Order"}
          </button>
        </form>
        {searchError && <p className="text-xs text-red-500 mb-3">{searchError}</p>}

        {loading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading your orders...</p>
          </div>
        ) : (
          <>
            {/* Recent Order */}
            {recentOrder && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground">Recent Order</h2>
                  <span className="text-xs text-primary font-semibold cursor-pointer">View All</span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <img src={recentOrder.image} alt={recentOrder.name} className="w-14 h-14 object-cover rounded-xl bg-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm">{recentOrder.name}</p>
                      {recentOrder.specs && <p className="text-[10px] text-muted-foreground">{recentOrder.specs}</p>}
                      <p className="text-[10px] text-muted-foreground">Order ID: {recentOrder.orderId}</p>
                      <p className="text-[10px] text-muted-foreground">Placed on: {recentOrder.placedOn}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${statusColors[recentOrder.status] ?? "bg-muted text-foreground border-border"}`}>
                        {recentOrder.status}
                      </span>
                      <p className="text-[9px] text-muted-foreground mt-1.5">Est. Delivery</p>
                      <p className="text-[10px] font-bold text-primary">{recentOrder.estDelivery}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center ml-1" />
                  </div>
                  {recentOrder.trackingLink && (
                    <div className="mb-4">
                      <Link
                        href={recentOrder.trackingLink}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                        View Payment Tracking Link
                      </Link>
                    </div>
                  )}
                  {/* Timeline */}
                  <div className="flex items-start">
                    {recentOrder.timeline.map((step, i) => (
                      <div key={step.label} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <div className="relative flex items-center w-full mb-1.5">
                            {i > 0 && <div className={`flex-1 h-0.5 ${recentOrder.timeline[i - 1].done ? "bg-primary" : "bg-border"}`} />}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 shadow-sm ${step.active ? "bg-primary ring-4 ring-primary/20" : step.done ? "bg-primary" : "bg-muted border-2 border-border"}`}>
                              {step.done && !step.active && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                              {step.active && <Truck className="w-3.5 h-3.5 text-white" />}
                              {!step.done && !step.active && <MapPin className="w-3 h-3 text-muted-foreground" />}
                            </div>
                            {i < recentOrder.timeline.length - 1 && <div className={`flex-1 h-0.5 ${step.done && !step.active ? "bg-primary" : "bg-border"}`} />}
                          </div>
                          <p className={`text-[9px] text-center font-medium leading-tight ${step.active ? "text-primary" : step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* All Orders */}
            <h2 className="text-sm font-bold text-foreground mb-3">All Orders</h2>
            <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible pb-2 mb-4">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeFilter === tab ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {!token && !trackedOrder ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-bold text-foreground">Enter your order ID to track your order</p>
                <p className="text-xs text-muted-foreground mt-1">You can search with your order ID or tracking number.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-bold text-foreground">No orders found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {orders.length === 0 ? "You haven't placed any orders yet" : "No orders match this filter"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {filtered.map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-all"
                  >
                    <img src={order.image} alt={order.name} className="w-14 h-14 object-cover rounded-xl bg-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{order.name}</p>
                      {order.specs && <p className="text-[10px] text-muted-foreground">{order.specs}</p>}
                      <p className="text-[10px] text-muted-foreground">Order ID: {order.orderId}</p>
                      <p className="text-[10px] text-muted-foreground">Placed on: {order.placedOn}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${statusColors[order.status] ?? "bg-muted text-foreground border-border"}`}>{order.status}</span>
                      <p className="text-[9px] text-muted-foreground mt-1.5">
                        {order.status === "Delivered" ? "Delivered on" : order.status === "Cancelled" ? "Cancelled" : "Est. Delivery"}
                      </p>
                      <p className={`text-[10px] font-bold ${order.status === "Cancelled" ? "text-red-500" : "text-primary"}`}>{order.estDelivery}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Need Help */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 mt-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Need Help?</p>
            <p className="text-xs text-muted-foreground">Our support team is here to help you with your order.</p>
          </div>
          <Link href="/contact">
            <button className="px-3 py-2 border border-primary/40 text-primary rounded-xl text-xs font-bold hover:bg-primary/10 transition-all flex-shrink-0">
              Contact Support
            </button>
          </Link>
        </div>
    </AccountLayout>
  );
}
