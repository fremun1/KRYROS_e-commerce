import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, ChevronRight, Headphones, CheckCircle, Truck, MapPin, Loader2, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { fetchOrders, type ApiOrder } from "@/lib/api";
import AccountLayout from "@/components/layout/AccountLayout";

const statusColors: Record<string, string> = {
  "Pending":          "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Processing":       "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Confirmed":        "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "Shipped":          "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "In Transit":       "bg-primary/10 text-primary border-primary/20",
  "Delivered":        "bg-green-500/10 text-green-600 border-green-500/20",
  "Collected":        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Cancelled":        "bg-red-500/10 text-red-600 border-red-500/20",
  "Refunded":         "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Returned":         "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

const filterTabs = ["All Orders", "Confirmed", "Shipped", "In Transit", "Delivered", "Collected", "Cancelled"];

const STATUS_MAP: Record<string, string> = {
  PENDING:    "Pending",
  PROCESSING: "Processing",
  CONFIRMED:  "Confirmed",
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

function getTimeline(status: string) {
  const norm = normalizeStatus(status);
  const steps = [
    { label: "Pending",    threshold: ["Pending","Processing","Confirmed","Shipped","In Transit","Delivered","Collected"] },
    { label: "Confirmed",  threshold: ["Confirmed","Shipped","In Transit","Delivered","Collected"] },
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
    norm === "Confirmed"  ? 1 : 0;
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
}

function normalizeOrder(o: ApiOrder): OrderRow {
  const item = o.items?.[0];
  const imgRaw = item?.product?.images?.[0];
  const image = typeof imgRaw === "string" ? imgRaw : (imgRaw as any)?.url ?? "";
  const status = normalizeStatus(o.status);
  return {
    id: String(o.id),
    name: item?.product?.name ?? "Order",
    specs: item?.product?.specs ?? "",
    orderId: `#${o.orderNumber ?? o.id}`,
    placedOn: o.createdAt
      ? new Date(o.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
      : "",
    status,
    estDelivery: o.estimatedDelivery
      ? new Date(o.estimatedDelivery).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    image: image || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80",
    timeline: getTimeline(o.status),
  };
}

const STATUS_FILTER_MAP: Record<string, string[]> = {
  "Confirmed":  ["Confirmed"],
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

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchOrders(token)
      .then((data) => setOrders(data.map(normalizeOrder)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const recentOrder = orders[0] ?? null;

  const filtered = orders.filter((o) => {
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
        <div className="flex gap-2 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter Order ID or Tracking Number"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button className="px-4 py-3 bg-foreground text-background rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex-shrink-0">
            Track Order
          </button>
        </div>

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

            {!token ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-bold text-foreground">Sign in to view your orders</p>
                <Link href="/login">
                  <button className="mt-4 px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold">Sign In</button>
                </Link>
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
