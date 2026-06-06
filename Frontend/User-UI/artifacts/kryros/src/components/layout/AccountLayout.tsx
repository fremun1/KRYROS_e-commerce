import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, Heart, MapPin, CreditCard, Zap,
  MessageCircle, RefreshCcw, Star, Settings, X, Menu,
  Globe, DollarSign, ChevronDown, Search, ShoppingBag,
  Bell, LogOut, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";

const footerLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Refund Policy", href: "/refund" },
];

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Orders", href: "/track" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: CreditCard, label: "Payment Methods", href: "/get-now" },
  { icon: Zap, label: "Get Now Plans", href: "/get-now" },
  { icon: MapPin, label: "Pickup Stations", href: "/pickup-stations" },
  { icon: MessageCircle, label: "Messages", href: "/contact" },
  { icon: RefreshCcw, label: "Returns & Refunds", href: "/returns" },
  { icon: Star, label: "My Reviews", href: "/shop" },
  { icon: Settings, label: "Settings", href: "/dashboard" },
];

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const { user, logout } = useAuthStore();
  const selectedCurrency = useCurrencyStore((s) => s.selected);

  const displayName = user ? `${user.firstName} ${user.lastName}` : "Guest";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
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
          className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-full transition-colors lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {sidebarItems.map(({ icon: Icon, label, href }) => {
          const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
          return (
            <Link key={label} href={href}>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 text-left
                  ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${isActive ? "font-semibold text-primary" : ""}`}>{label}</span>
              </button>
            </Link>
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
          <p className="pb-1 text-[9px] text-muted-foreground/40 text-center w-full">Worldwide Shopping</p>
        </div>
      </div>
    </div>
  );

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

      {/* Main content */}
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
            <Link href="/shop">
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Search style={{ width: 18, height: 18 }} className="text-foreground" />
              </button>
            </Link>

            <Link href="/wishlist">
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Heart style={{ width: 18, height: 18 }} className="text-foreground" />
              </button>
            </Link>

            <Link href="/cart">
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <ShoppingBag style={{ width: 18, height: 18 }} className="text-foreground" />
              </button>
            </Link>

            <Link href="/track">
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Bell style={{ width: 18, height: 18 }} className="text-foreground" />
              </button>
            </Link>

            <div className="flex items-center gap-1.5">
              <Link href="/dashboard">
                <button className="flex items-center gap-1.5 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-2 ring-primary/30 text-white text-xs font-black">
                    {initials}
                  </div>
                  <span className="hidden md:block text-sm font-semibold text-foreground max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-28 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
