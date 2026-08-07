import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { inferPageContext, getPageContextDisplayPath } from "@/lib/pageContext";
import {
  LayoutDashboard, Package, Heart, MapPin, CreditCard, Zap,
  MessageCircle, RefreshCcw, Star, Settings, X, Menu,
  ChevronDown, Search, ShoppingBag,
  Bell, LogOut, ChevronRight, Check, Clock
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Orders", href: "/track" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: CreditCard, label: "Payment Methods", href: "/get-now" },
  { icon: Zap, label: "Get Now Plans", href: "/get-now" },
  { icon: MapPin, label: "Pickup Stations", href: "/pickup-stations" },
  { icon: MessageCircle, label: "Messages", href: "/contact" },
  { icon: RefreshCcw, label: "Returns & Refunds", href: "/returns" },
  { icon: Star, label: "My Reviews", href: "/" }, // Root is always safer than hardcoded /shop
  { icon: Settings, label: "Settings", href: "/dashboard" },
];

interface AccountLayoutProps {
  children: React.ReactNode;
  /**
   * Controls whether the internal account top bar is shown.
   * Some pages already render the global site header, so showing both creates a double top bar.
   */
  showTopBar?: boolean;
}

export default function AccountLayout({ children, showTopBar = true }: AccountLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const pageContext = useMemo(() => inferPageContext(location), [location]);
  const displayBasePath = useMemo(() => getPageContextDisplayPath(pageContext), [pageContext]);

  const { user, logout, notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (user) {
      fetchNotifications();
      // Poll every 2 minutes for new notifications
      timer = setInterval(fetchNotifications, 120000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [user, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node) &&
          bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-[var(--kryros-header-navy)]">
        <Link href="/">
          <span className="flex items-center text-white cursor-pointer">
            <img
              src="/kryros-logo.png"
              alt="KRYROS"
              className="w-10 h-10 object-contain"
            />
            <span className="ml-2 text-xl font-black tracking-tight uppercase">KRYROS</span>
          </span>
        </Link>
        <button
          className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors lg:hidden text-white"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4" />
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
          <div className="absolute inset-0 bg-kryros-overlay-dark/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-56 bg-background h-full flex flex-col shadow-2xl z-10 border-r border-border">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top bar (optional) */}
        {showTopBar && (
          <div className="sticky top-0 z-20 bg-[var(--kryros-header-navy)] border-b border-white/10 flex items-center justify-between px-4 md:px-6 py-3 shadow-sm">
            <button
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="hidden lg:block" />

            <div className="flex items-center gap-3">
              <Link href={displayBasePath}>
                <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
                  <Search style={{ width: 18, height: 18 }} className="text-white" />
                </button>
              </Link>

              <Link href="/wishlist">
                <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
                  <Heart style={{ width: 18, height: 18 }} className="text-white" />
                </button>
              </Link>

              <Link href="/cart">
                <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
                  <ShoppingBag style={{ width: 18, height: 18 }} className="text-white" />
                </button>
              </Link>

              <div className="relative">
                <button 
                  ref={bellRef}
                  onClick={() => setNotifOpen(!notifOpen)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors relative ${notifOpen ? 'bg-white/10' : ''}`}
                >
                  <Bell style={{ width: 18, height: 18 }} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--kryros-header-navy)]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div 
                    ref={notifRef}
                    className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-primary" />
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 px-4 text-center">
                          <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id}
                            onClick={() => {
                              if (!n.isRead) markAsRead(n.id);
                              if (n.data?.url) setLocation(n.data.url);
                              setNotifOpen(false);
                            }}
                            className={`p-4 border-b border-border last:border-0 cursor-pointer hover:bg-muted transition-colors flex gap-3 items-start ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs mb-0.5 truncate ${!n.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                {n.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <div className="flex items-center gap-1 mt-2 text-[9px] text-muted-foreground/60">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(n.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Link href="/track">
                      <div 
                        onClick={() => setNotifOpen(false)}
                        className="p-3 bg-muted/30 text-center border-t border-border cursor-pointer hover:bg-muted transition-colors"
                      >
                        <span className="text-[11px] font-bold text-primary">View All History</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Link href="/dashboard">
                  <button className="flex items-center gap-1.5 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-2 ring-primary/30 text-white text-xs font-black">
                      {initials}
                    </div>
                    <span className="hidden md:block text-sm font-semibold text-white max-w-[100px] truncate">{displayName}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                  </button>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-28 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
