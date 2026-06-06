import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, Heart, MapPin, CreditCard, Zap,
  MessageCircle, Bell, RefreshCcw, Star, Settings, ChevronRight, Check,
  Truck, MoreVertical, Plus, Globe, Sun, DollarSign, X, Search,
  ChevronDown, Menu, ShoppingBag, Info, Tag, AlertCircle, LogOut,
  UserCircle, Phone, Mail, Edit2, Save, Loader2, Home, Building2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { API_BASE } from "@/lib/api";

const footerLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Refund Policy", href: "/refund" },
];

function getOrderTimeline(status: string) {
  const norm = ({
    PENDING: "Pending", PROCESSING: "Processing", SHIPPED: "In Transit",
    IN_TRANSIT: "In Transit", OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered", CANCELLED: "Cancelled",
  } as Record<string, string>)[status?.toUpperCase?.()] ?? status ?? "Pending";

  const steps = ["Order Confirmed", "Shipped", "In Transit", "Delivered"];
  const activeIdx =
    norm === "Delivered" ? 3 :
    norm === "Out for Delivery" ? 3 :
    norm === "In Transit" ? 2 :
    norm === "Processing" ? 1 : 0;
  const doneSet = new Set(
    norm === "Delivered" ? [0,1,2,3] :
    norm === "Out for Delivery" ? [0,1,2] :
    norm === "In Transit" ? [0,1] :
    norm === "Processing" ? [0] : []
  );
  return steps.map((label, i) => ({
    label,
    done: doneSet.has(i),
    active: i === activeIdx && norm !== "Delivered" && norm !== "Cancelled",
    date: "",
  }));
}

const statusColors: Record<string, string> = {
  "In Transit": "bg-primary/10 text-primary",
  "Delivered": "bg-green-500/10 text-green-600",
  "Out for Delivery": "bg-orange-500/10 text-orange-600",
  "Cancelled": "bg-red-500/10 text-red-600",
  "Pending": "bg-yellow-500/10 text-yellow-600",
  "Processing": "bg-blue-500/10 text-blue-600",
};

interface OrderItem {
  id: string;
  name: string;
  orderId: string;
  date: string;
  status: string;
  image: string;
}

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    name: string;
    price: number;
    comparePrice?: number;
    images: { url: string; isPrimary: boolean }[];
  };
}

interface Address {
  id: string;
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  isDefault?: boolean;
  [key: string]: unknown;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  addresses: Address[];
}

type ActiveSection = "overview" | "profile" | "addresses";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
  const [, setLocation] = useLocation();
  const addressesRef = useRef<HTMLDivElement>(null);

  const { user, token, logout } = useAuthStore();
  const format = useCurrencyStore((s) => s.format);
  const selectedCurrency = useCurrencyStore((s) => s.selected);
  const displayName = user ? `${user.firstName} ${user.lastName}` : "Guest";
  const firstName = user?.firstName ?? "there";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const liveTimeline = getOrderTimeline(recentOrders[0]?.status ?? "Pending");

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!token) return;
    setOrdersLoading(true);
    fetch(`${API_BASE}/api/orders/my-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.data ?? data.orders ?? []);
        const mapped: OrderItem[] = list.slice(0, 5).map((o: any) => ({
          id: String(o.id),
          name: o.items?.[0]?.product?.name ?? o.productName ?? "Order",
          orderId: `#${o.orderNumber ?? o.id}`,
          date: o.createdAt
            ? new Date(o.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
            : "",
          status: o.status ?? "Pending",
          image:
            o.items?.[0]?.product?.images?.[0]?.url ??
            o.items?.[0]?.product?.images?.[0] ??
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&q=80",
        }));
        setRecentOrders(mapped);
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setWishlistLoading(true);
    fetch(`${API_BASE}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setWishlist(list);
      })
      .catch(() => {})
      .finally(() => setWishlistLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setProfileLoading(true);
    fetch(`${API_BASE}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setEditForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phone: data.phone ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [token]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const handleSaveProfile = async () => {
    if (!token || !user) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(Array.isArray(err.message) ? err.message.join(", ") : (err.message ?? "Update failed"));
      }
      const updated = await res.json();
      setProfile((p) => p ? { ...p, ...updated } : p);
      setEditMode(false);
    } catch (e: any) {
      setEditError(e.message ?? "Something went wrong");
    } finally {
      setEditSaving(false);
    }
  };

  const sidebarItems: { icon: any; label: string; section?: ActiveSection; href?: string }[] = [
    { icon: LayoutDashboard, label: "Dashboard", section: "overview" },
    { icon: Package, label: "Orders", href: "/track" },
    { icon: Heart, label: "Wishlist", href: "/wishlist" },
    { icon: MapPin, label: "Addresses", section: "addresses" },
    { icon: CreditCard, label: "Payment Methods", href: "/get-now" },
    { icon: Zap, label: "Get Now Plans", href: "/get-now" },
    { icon: MapPin, label: "Pickup Stations", href: "/pickup-stations" },
    { icon: MessageCircle, label: "Messages", href: "/contact" },
    { icon: RefreshCcw, label: "Returns & Refunds", href: "/returns" },
    { icon: Star, label: "My Reviews", href: "/shop" },
    { icon: Settings, label: "Settings", section: "profile" },
  ];

  const quickActions = [
    { icon: Package, label: "My Orders", sub: "Track and manage your orders", href: "/track" },
    { icon: RefreshCcw, label: "Returns", sub: "Request return or check status", href: "/returns" },
    { icon: CreditCard, label: "Get Now Plans", sub: "Buy now, pay later plans", href: "/get-now" },
    { icon: MapPin, label: "Pickup Stations", sub: "Find and manage pickup locations", href: "/pickup-stations" },
    { icon: Settings, label: "Edit Profile", sub: "Manage your account details", section: "profile" as ActiveSection },
  ];

  const handleNav = (item: { section?: ActiveSection; href?: string }) => {
    setSidebarOpen(false);
    if (item.section) {
      setActiveSection(item.section);
      if (item.section === "addresses") {
        setTimeout(() => addressesRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (item.href) {
      setLocation(item.href);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <Link href="/">
          <span className="text-lg font-black text-foreground cursor-pointer">
            KRY<span className="text-primary">ROS</span>
          </span>
        </Link>
        <button
          className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {sidebarItems.map(({ icon: Icon, label, section, href }) => {
          const isActive = section ? activeSection === section : false;
          return (
            <button
              key={label}
              onClick={() => handleNav({ section, href })}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 text-left
                ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${isActive ? "font-semibold text-primary" : ""}`}>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-0.5">
        {[
          { icon: DollarSign, label: `${selectedCurrency.code} - ${selectedCurrency.name}` },
          { icon: Globe, label: "English" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted cursor-pointer transition-all">
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
        ))}
        <div className="pt-2 space-y-0.5">
          {footerLinks.map(({ label, href }) => (
            <Link key={label} href={href}>
              <p className="px-3 py-1 text-[10px] text-muted-foreground hover:text-primary cursor-pointer transition-colors">{label}</p>
            </Link>
          ))}
          <p className="px-3 pt-1 text-[9px] text-muted-foreground/60">© 2026 KRYROS. All Rights Reserved.</p>
          <p className="px-3 pb-1 text-[9px] text-muted-foreground/40">Worldwide Shopping</p>
        </div>
      </div>
    </div>
  );

  const ProfileSection = () => (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your personal information</p>
        </div>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditMode(false); setEditError(""); }}
              className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={editSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-4 ring-primary/20 text-white text-2xl font-black">
            {initials}
          </div>
          <div>
            <p className="text-base font-black text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email ?? "No email set"}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-full uppercase tracking-wide">
              {user?.role?.toLowerCase?.() ?? "customer"}
            </span>
          </div>
        </div>

        {editError && (
          <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 font-medium">
            {editError}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">First Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <p className="text-sm font-semibold text-foreground px-3 py-2 bg-muted/40 rounded-xl">{profile?.firstName ?? user?.firstName ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Last Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <p className="text-sm font-semibold text-foreground px-3 py-2 bg-muted/40 rounded-xl">{profile?.lastName ?? user?.lastName ?? "—"}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              <Mail className="inline w-3 h-3 mr-1" />Email Address
            </label>
            <p className="text-sm font-semibold text-foreground px-3 py-2 bg-muted/40 rounded-xl text-muted-foreground">
              {profile?.email ?? user?.email ?? "Not set"}
              <span className="ml-2 text-[9px] text-muted-foreground/60">(contact support to change)</span>
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              <Phone className="inline w-3 h-3 mr-1" />Phone Number
            </label>
            {editMode ? (
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                maxLength={30}
                placeholder="+260966423719"
                className="w-full px-3 py-2 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground px-3 py-2 bg-muted/40 rounded-xl">{profile?.phone ?? "Not set"}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Account Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/track">
            <button className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors">
              <Package className="w-3.5 h-3.5" /> My Orders
            </button>
          </Link>
          <Link href="/returns">
            <button className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors">
              <RefreshCcw className="w-3.5 h-3.5" /> Returns
            </button>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-900/30 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  const AddressesSection = () => {
    const addresses = profile?.addresses ?? [];
    return (
      <div className="max-w-2xl" ref={addressesRef}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground">Saved Addresses</h1>
            <p className="text-sm text-muted-foreground">Manage your delivery addresses</p>
          </div>
          <button
            onClick={() => setActiveSection("overview")}
            className="text-xs text-primary font-semibold hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          {profileLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-2.5 bg-muted rounded w-3/4" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <MapPin className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No saved addresses yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Addresses will appear here after you place an order</p>
              <Link href="/shop">
                <button className="mt-4 px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
                  Start Shopping
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr, i) => {
                const label = addr.label ?? (addr.isDefault ? "Default" : `Address ${i + 1}`);
                const IconComp = label.toLowerCase().includes("home") ? Home : Building2;
                const lines: string[] = [];
                if (addr.street) lines.push(addr.street);
                if (addr.city || addr.state) lines.push([addr.city, addr.state].filter(Boolean).join(", "));
                if (addr.zip || addr.country) lines.push([addr.zip, addr.country].filter(Boolean).join(" "));
                if (lines.length === 0) lines.push(JSON.stringify(addr));
                return (
                  <div key={addr.id ?? i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconComp className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-bold text-foreground">{label}</p>
                        {addr.isDefault && (
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded-full">Default</span>
                        )}
                      </div>
                      {lines.map((line, li) => (
                        <p key={li} className="text-[10px] text-muted-foreground leading-snug">{line}</p>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="text-[10px] text-primary font-semibold hover:underline">Edit</button>
                      <MoreVertical className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:bg-primary/5 px-3 py-2 rounded-xl transition-colors mt-3">
            <Plus className="w-3.5 h-3.5" />
            + Add New Address
          </button>
        </div>
      </div>
    );
  };

  const wishlistDisplay = wishlist.slice(0, 3);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-border sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-56 bg-background h-full flex flex-col shadow-2xl z-10 border-r border-border">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">

        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 py-3">
          <button
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            {/* Search */}
            <Link href="/shop">
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Search style={{ width: 18, height: 18 }} className="text-foreground" />
              </button>
            </Link>

            {/* Wishlist */}
            <Link href="/wishlist">
              <button className="relative w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Heart style={{ width: 18, height: 18 }} className="text-foreground" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center">
                    {wishlist.length > 9 ? "9+" : wishlist.length}
                  </span>
                )}
              </button>
            </Link>

            {/* Cart */}
            <Link href="/cart">
              <button className="relative w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <ShoppingBag style={{ width: 18, height: 18 }} className="text-foreground" />
              </button>
            </Link>

            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
              >
                <Bell style={{ width: 18, height: 18 }} className="text-foreground" />
                {recentOrders.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center">
                    {recentOrders.length > 9 ? "9+" : recentOrders.length}
                  </span>
                )}
              </button>

              {/* Notification dropdown — shows recent orders as activity */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-10 z-40 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
                      <button className="text-[10px] text-primary font-semibold hover:underline" onClick={() => setNotifOpen(false)}>Close</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-border">
                      {recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center py-6">
                          <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">No recent activity</p>
                        </div>
                      ) : (
                        recentOrders.map((order) => (
                          <div key={order.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Truck className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{order.name}</p>
                              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{order.orderId} · {order.status}</p>
                            </div>
                            <span className="text-[9px] text-muted-foreground flex-shrink-0 mt-0.5 whitespace-nowrap">{order.date}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-border">
                      <Link href="/track">
                        <button className="w-full text-xs text-primary font-semibold text-center hover:underline" onClick={() => setNotifOpen(false)}>
                          View all orders
                        </button>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar + profile */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setActiveSection("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-1.5 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-2 ring-primary/30 text-white text-xs font-black">
                  {initials}
                </div>
                <span className="hidden md:block text-sm font-semibold text-foreground max-w-[100px] truncate">{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-28 lg:pb-10">

          {/* Profile Section */}
          {activeSection === "profile" && <ProfileSection />}

          {/* Addresses Section */}
          {activeSection === "addresses" && <AddressesSection />}

          {/* Overview Section */}
          {activeSection === "overview" && (
            <>
              {/* Page header */}
              <div className="mb-6">
                <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {firstName}!</p>
              </div>

              {/* 4 Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: ShoppingBag, label: "Total Orders", value: ordersLoading ? "—" : String(recentOrders.length), href: "/track", iconBg: "#e6faf8", iconColor: "var(--kryros-primary)" },
                  { icon: Heart, label: "Wishlist Items", value: wishlistLoading ? "—" : String(wishlist.length), href: "/wishlist", iconBg: "#fdf2f8", iconColor: "#ec4899" },
                  { icon: Zap, label: "Get Now Credit", value: "Apply", href: "/get-now", iconBg: "#fff7ed", iconColor: "#f97316" },
                  { icon: MapPin, label: "Addresses", value: profileLoading ? "—" : String(profile?.addresses?.length ?? 0), onClick: () => { setActiveSection("addresses"); window.scrollTo({ top: 0, behavior: "smooth" }); }, iconBg: "#f5f3ff", iconColor: "#8b5cf6" },
                ].map(({ icon: Icon, label, value, href, onClick, iconBg, iconColor }) => (
                  <div key={label} onClick={onClick} className="cursor-pointer">
                    {href ? (
                      <Link href={href}>
                        <div className="bg-card border border-border rounded-xl px-3 py-3 flex items-center gap-3 hover:shadow-sm hover:border-primary/20 transition-all">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                            <Icon style={{ width: 18, height: 18, color: iconColor }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
                            <p className="text-base font-black text-foreground leading-tight">{value}</p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="bg-card border border-border rounded-xl px-3 py-3 flex items-center gap-3 hover:shadow-sm hover:border-primary/20 transition-all">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                          <Icon style={{ width: 18, height: 18, color: iconColor }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
                          <p className="text-base font-black text-foreground leading-tight">{value}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recent Orders + Order Tracking */}
              <div className="grid lg:grid-cols-2 gap-4 mb-4">

                {/* Recent Orders */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground">Recent Orders</h2>
                    <Link href="/track">
                      <span className="flex items-center gap-0.5 text-xs text-primary cursor-pointer hover:underline font-medium">
                        View All Orders <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {ordersLoading ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl p-2 animate-pulse">
                          <div className="w-11 h-11 rounded-xl bg-muted flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-muted rounded w-3/4" />
                            <div className="h-2.5 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))
                    ) : recentOrders.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <Package className="w-10 h-10 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">No orders yet</p>
                        <Link href="/shop">
                          <span className="text-xs text-primary hover:underline cursor-pointer mt-1">Start shopping →</span>
                        </Link>
                      </div>
                    ) : (
                      recentOrders.map((order) => (
                        <Link key={order.id} href="/track">
                          <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/50 transition-all cursor-pointer">
                            <img src={order.image} alt={order.name} className="w-11 h-11 object-cover rounded-xl bg-muted flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{order.name}</p>
                              <p className="text-[10px] text-muted-foreground">Order ID: {order.orderId}</p>
                              <p className="text-[10px] text-muted-foreground">{order.date}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>
                                {order.status}
                              </span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* Order Tracking */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-foreground">Order Tracking</h2>
                    <Link href="/track">
                      <span className="flex items-center gap-0.5 text-xs text-primary cursor-pointer hover:underline font-medium">
                        Track Your Order <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2 font-medium">Latest Order</p>
                  {recentOrders.length > 0 ? (
                    <div className="flex items-center gap-3 mb-5 p-2 rounded-xl">
                      <img src={recentOrders[0].image} alt={recentOrders[0].name} className="w-12 h-12 object-cover rounded-xl bg-muted flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{recentOrders[0].name}</p>
                        <p className="text-[10px] text-muted-foreground">Order ID: {recentOrders[0].orderId}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-5 p-2 rounded-xl bg-muted/40">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">No orders yet</p>
                        <p className="text-[10px] text-muted-foreground">Place an order to track it here</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start mb-5 px-1">
                    {liveTimeline.map((step, i) => (
                      <div key={step.label} className="flex items-start flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className="flex items-center w-full">
                            {i > 0 && <div className={`flex-1 h-0.5 ${liveTimeline[i - 1].done ? "bg-primary" : "bg-border"}`} />}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2
                              ${step.active ? "bg-primary border-primary ring-4 ring-primary/20"
                                : step.done ? "bg-primary border-primary"
                                : "bg-background border-border"}`}>
                              {step.active && <Truck className="w-3.5 h-3.5 text-white" />}
                              {step.done && !step.active && <Check className="w-3.5 h-3.5 text-white" />}
                              {!step.done && !step.active && <MapPin className="w-3 h-3 text-muted-foreground" />}
                            </div>
                            {i < liveTimeline.length - 1 && <div className={`flex-1 h-0.5 ${step.done && !step.active ? "bg-primary" : "bg-border"}`} />}
                          </div>
                          <p className={`text-[9px] text-center mt-1.5 font-semibold leading-tight px-0.5
                            ${step.active ? "text-primary" : step.done ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </p>
                          <p className="text-[8px] text-muted-foreground text-center mt-0.5">{step.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/40 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Estimated Delivery</p>
                      <p className="text-lg font-black text-primary">
                        {recentOrders.length > 0 ? "Check Track Page" : "No active order"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 opacity-20">
                      <svg viewBox="0 0 80 50" className="w-20 h-12" fill="none">
                        <rect x="2" y="20" width="50" height="22" rx="3" fill="currentColor" className="text-foreground" />
                        <polygon points="52,20 52,36 66,36 66,28" fill="currentColor" className="text-foreground" />
                        <rect x="56" y="36" width="8" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
                        <circle cx="14" cy="40" r="5" fill="currentColor" className="text-foreground" />
                        <circle cx="14" cy="40" r="2" fill="white" />
                        <circle cx="58" cy="40" r="5" fill="currentColor" className="text-foreground" />
                        <circle cx="58" cy="40" r="2" fill="white" />
                        <rect x="6" y="24" width="8" height="6" rx="1" fill="white" opacity="0.6" />
                        <rect x="18" y="24" width="12" height="6" rx="1" fill="white" opacity="0.4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Get Now Banner */}
              <div
                className="rounded-2xl overflow-hidden mb-4 relative"
                style={{ background: "linear-gradient(135deg, #07392f 0%, #0a5544 60%, #073d2e 100%)" }}
              >
                <div className="flex items-center justify-between p-5 md:p-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white mb-1">Get More with Get Now</h3>
                    <p className="text-white/60 text-xs mb-5 max-w-[220px] leading-relaxed">
                      Shop now and pay later with flexible plans that suit you.
                    </p>
                    <Link href="/get-now">
                      <button className="px-5 py-2.5 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-white/90 transition-all">
                        Explore Plans
                      </button>
                    </Link>
                  </div>
                  <div className="flex-shrink-0 relative hidden md:flex items-end gap-2" style={{ height: 120 }}>
                    <div className="absolute -top-2 left-0 flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-xl px-2.5 py-1.5 backdrop-blur-sm z-10">
                      <Check className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-white">Instant Approval</span>
                    </div>
                    <div className="absolute -top-2 right-0 flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-xl px-2.5 py-1.5 backdrop-blur-sm z-10">
                      <span className="text-[10px] font-bold text-white">0% Interest</span>
                    </div>
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 self-end">
                      <div className="w-full h-full bg-primary/80 flex flex-col items-center justify-end pb-2">
                        <ShoppingBag className="w-8 h-8 text-white/80 mb-1" />
                        <span className="text-[8px] font-black text-white">KRYROS</span>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl self-end flex-shrink-0">
                      <img src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100&q=80" alt="headphones" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 right-0 flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-xl px-2.5 py-1.5 backdrop-blur-sm z-10">
                      <span className="text-[10px] font-bold text-white">Flexible Plans</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wishlist + Saved Addresses */}
              <div className="grid lg:grid-cols-2 gap-4 mb-6">

                {/* Wishlist */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground">Wishlist</h2>
                    <Link href="/shop">
                      <span className="flex items-center gap-0.5 text-xs text-primary cursor-pointer hover:underline font-medium">
                        View All <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>

                  {wishlistLoading ? (
                    <div className="flex gap-3 mb-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 flex-1 animate-pulse">
                          <div className="w-full aspect-square rounded-xl bg-muted" />
                          <div className="h-3 bg-muted rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : wishlistDisplay.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center mb-4">
                      <Heart className="w-10 h-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground font-medium">Your wishlist is empty</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Save items you love while shopping</p>
                    </div>
                  ) : (
                    <div className="flex gap-3 mb-4">
                      {wishlistDisplay.map((item) => {
                        const img = item.product?.images?.find((i) => i.isPrimary)?.url ?? item.product?.images?.[0]?.url;
                        const price = item.product?.price != null
                          ? format(Number(item.product.price))
                          : "";
                        return (
                          <div key={item.id} className="flex flex-col items-center gap-1.5 flex-1">
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted">
                              {img ? (
                                <img src={img} alt={item.product?.name ?? "Product"} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-6 h-6 text-muted-foreground/40" />
                                </div>
                              )}
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Heart className="w-3 h-3 fill-primary text-primary" />
                              </div>
                            </div>
                            {price && <span className="text-[11px] font-bold text-foreground">{price}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Link href="/shop">
                    <button className="w-full py-2.5 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                      Go to Wishlist
                    </button>
                  </Link>
                </div>

                {/* Saved Addresses preview */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground">Saved Addresses</h2>
                    <button
                      onClick={() => { setActiveSection("addresses"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="flex items-center gap-0.5 text-xs text-primary cursor-pointer hover:underline font-medium"
                    >
                      Manage All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {profileLoading ? (
                    <div className="space-y-3 mb-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl animate-pulse">
                          <div className="w-8 h-8 rounded-xl bg-muted flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-muted rounded w-1/4" />
                            <div className="h-2.5 bg-muted rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (profile?.addresses ?? []).length === 0 ? (
                    <div className="flex flex-col items-center py-4 text-center mb-3">
                      <MapPin className="w-8 h-8 text-muted-foreground/30 mb-1.5" />
                      <p className="text-xs text-muted-foreground font-medium">No saved addresses</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Added at checkout automatically</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mb-3">
                      {(profile?.addresses ?? []).slice(0, 2).map((addr, i) => {
                        const label = addr.label ?? (addr.isDefault ? "Default" : `Address ${i + 1}`);
                        const IconComp = label.toLowerCase().includes("home") ? Home : Building2;
                        const line1 = addr.street ?? "";
                        const line2 = [addr.city, addr.state].filter(Boolean).join(", ");
                        const line3 = [addr.zip, addr.country].filter(Boolean).join(" ");
                        return (
                          <div key={addr.id ?? i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <IconComp className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground mb-0.5">{label}</p>
                              {[line1, line2, line3].filter(Boolean).map((ln, li) => (
                                <p key={li} className="text-[10px] text-muted-foreground leading-snug">{ln}</p>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button className="text-[10px] text-primary font-semibold hover:underline">Edit</button>
                              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => { setActiveSection("addresses"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:bg-primary/5 px-3 py-2 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add New Address
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-sm font-bold text-foreground mb-3">Quick Actions</h2>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {quickActions.map(({ icon: Icon, label, sub, href, section }) => (
                    <button
                      key={label}
                      onClick={() => {
                        if (section) {
                          setActiveSection(section);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        } else if (href) {
                          setLocation(href);
                        }
                      }}
                      className="flex flex-col items-center text-center gap-2 p-3 bg-card border border-border rounded-2xl cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="text-primary" style={{ width: 18, height: 18 }} />
                      </div>
                      <p className="text-[10px] font-bold text-foreground leading-tight">{label}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight hidden md:block">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
