import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { inferPageContext, getScopedBrowsePath, getPageContextDisplayPath } from "@/lib/pageContext";
import {
  ShoppingBag, Heart, User, Globe, Menu, Mic, ChevronDown, LogOut, LayoutDashboard, X, Grid2x2, Bell, Clock
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { useAuthStore } from "@/store/authStore";
import { EFFECTIVE_API_BASE } from "@/lib/api";
import Sidebar from "./Sidebar";
import SearchAutocomplete from "./SearchAutocomplete";
import AnnouncementBar from "./AnnouncementBar";

const DEFAULT_NAV = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Get Now", href: "/get-now" },
  { label: "Pay", href: "/pay" },
  { label: "Track Order", href: "/track" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Pickup Stations", href: "/pickup-stations" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

// NOTE: DEFAULT_NAV is kept for structural navigation (nav always needs links).
// Announcement bar has NO defaults — only shows when admin configures it in CMS.
type HeaderConfig = {
  announcementEnabled?: boolean;
  announcementText?: string;
  announcementCta?: string;
  announcementCtaLink?: string;
  announcementBgColor?: string;
  announcementTextColor?: string;
  navLinks?: typeof DEFAULT_NAV;
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const pageContext = inferPageContext(location);
  // APK button logic moved to Sidebar
  const showApkButton = false; // Set to false as we're moving it to Sidebar
  const [headerCfg, setHeaderCfg] = useState<HeaderConfig | null>(null);
  const [announceHidden, setAnnounceHidden] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(52);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${EFFECTIVE_API_BASE}/api/cms/site-config/header`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.value) setHeaderCfg(d.value); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${EFFECTIVE_API_BASE}/api/categories/active`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setHeaderCategories(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const obs = new ResizeObserver(() => setHeaderHeight(headerRef.current?.offsetHeight ?? 52));
    obs.observe(headerRef.current);
    setHeaderHeight(headerRef.current.offsetHeight || 52);
    return () => obs.disconnect();
  }, []);

  const rawNav = (headerCfg?.navLinks || DEFAULT_NAV).filter((l: any) => l.isActive !== false);
  const ensureLinks = [
    { label: "Pay", href: "/pay" },
    { label: "Track Order", href: "/track" },
  ];
  const desktopNav = [
    ...rawNav,
    ...ensureLinks.filter(e => !rawNav.some((n: any) => n.href === e.href)),
  ];
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebarStore();
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((t, i) => t + i.qty, 0);
  const wishlist = useWishlistStore((s) => s.items);

  const { currencies, selected, setCurrency } = useCurrencyStore();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [headerCategories, setHeaderCategories] = useState<Array<{id: string|number; name: string; slug: string; image?: string}>>([]);

  const { user, token, logout, notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useAuthStore();
  const isLoggedIn = !!(token && user);
  
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isLoggedIn) {
      fetchNotifications();
      timer = setInterval(fetchNotifications, 120000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoggedIn, fetchNotifications]);

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

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    // Force redirect to login page
    setLocation('/login');
  };

  const navigateTo = (path: string) => {
    setCatMenuOpen(false);
    setSidebarOpen(false);
    setLocation(path);
  };

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* FIXED header wrapper — always at top of viewport */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-40">
        <AnnouncementBar />

        <header className="bg-[var(--kryros-header-navy)] border-b border-white/10 shadow-sm">
          {/* Main header row — lg: max-width centered so content doesn't stretch on ultrawide */}
        <div className="flex items-center gap-2 px-3 md:px-6 h-[52px] md:h-[68px] lg:max-w-screen-xl lg:mx-auto lg:px-8">
          {/* Hamburger */}
          <button
            data-testid="header-menu-btn"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 md:p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0 md:hidden text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/">
            <span className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <img
                src="/kryros-logo.png"
                alt="KRYROS"
                className="w-9 h-9 md:w-11 md:h-11 object-contain"
                loading="eager"
                decoding="async"
              />
              <span className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">KRYROS</span>
            </span>
          </Link>

          {/* Desktop: Category dropdown + Search bar */}
          <div className="hidden md:flex flex-1 items-center gap-2 mx-4 lg:mx-6">
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setCatMenuOpen(!catMenuOpen)}
                className="flex items-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors lg:px-4"
              >
                <Menu className="w-4 h-4" />
                All Categories
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${catMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {catMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setCatMenuOpen(false)} />
                  <div className="absolute left-0 top-12 z-40 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-2 max-h-80 overflow-y-auto">
                      <Link href={getPageContextDisplayPath(pageContext)} onClick={() => setCatMenuOpen(false)}>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Grid2x2 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">All Products</span>
                        </button>
                      </Link>
                      {headerCategories.map(cat => {
                        const categoryPath = getScopedBrowsePath(pageContext, 'category', cat.slug || String(cat.id));
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => navigateTo(categoryPath)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
                          >
                            {cat.image ? (
                              <img src={cat.image} alt={cat.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-sm font-medium text-foreground">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <SearchAutocomplete
              showSearchButton
              placeholder="Search for products, brands and more..."
            />
          </div>

          {/* Spacer mobile */}
          <div className="flex-1 md:hidden" />

          {/* Desktop: Right icons — lg: slightly more gap */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {/* Currency selector */}
            <div className="relative">
              <button
                onClick={() => { setCurrencyOpen(!currencyOpen); setUserMenuOpen(false); }}
                className="flex items-center gap-1 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm text-white/80"
              >
                <span>{selected.flag} {selected.code}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {currencyOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setCurrencyOpen(false)} />
                  <div className="absolute right-0 top-10 z-40 w-52 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                    {currencies.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${c.code === selected.code ? "bg-primary/10 text-primary font-semibold" : "text-foreground"}`}
                      >
                        <span className="text-base">{c.flag}</span>
                        <span className="font-medium">{c.code}</span>
                        <span className="text-muted-foreground text-xs ml-auto">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button className="flex items-center gap-1 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm text-white/80">
              <Globe className="w-4 h-4" /><span>EN</span><ChevronDown className="w-3 h-3" />
            </button>

            {/* User menu */}
            <div className="relative">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => { setUserMenuOpen(!userMenuOpen); setCurrencyOpen(false); }}
                    className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-black">
                      {user.firstName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <ChevronDown className="w-3 h-3 text-white/60" />
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-11 z-40 w-52 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-bold text-foreground">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}>
                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors cursor-pointer text-foreground">
                            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Dashboard</span>
                          </div>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors text-destructive border-t border-border"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Link href="/login">
                  <button className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white">
                    <User className="w-5 h-5" />
                  </button>
                </Link>
              )}
            </div>

            {isLoggedIn && (
              <div className="relative">
                <button 
                  ref={bellRef}
                  onClick={() => setNotifOpen(!notifOpen)}
                  className={`relative p-2 rounded-xl hover:bg-white/10 transition-colors text-white ${notifOpen ? 'bg-white/10' : ''}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[var(--kryros-header-navy)]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div 
                    ref={notifRef}
                    className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
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
                            <div className="flex-1 min-w-0 text-left">
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
            )}

            <Link href="/wishlist">
              <button className="relative p-2 rounded-xl hover:bg-white/10 transition-colors text-white">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlist.length > 9 ? "9+" : wishlist.length}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/cart">
              <button className="relative p-2 rounded-xl hover:bg-white/10 transition-colors text-white" data-testid="cart-icon">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            </Link>
          </div>

          {/* Mobile: Right icons */}
          <div className="flex md:hidden items-center gap-0.5">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <button className="p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black">
                    {user.firstName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                </button>
              </Link>
            ) : (
              <Link href="/login">
                <button className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white"><User className="w-5 h-5" /></button>
              </Link>
            )}
            <Link href="/wishlist">
              <button className="relative p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlist.length > 9 ? "9+" : wishlist.length}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/cart">
              <button className="relative p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>

        {/* Mobile: Always-visible search bar */}
        <div className="md:hidden px-3 pb-2.5 bg-[var(--kryros-header-navy)] border-b border-white/10">
          <SearchAutocomplete
            placeholder="Search for products, brands and more..."
            rightSlot={
              <button type="button" className="px-3 py-2 text-muted-foreground">
                <Mic className="w-4 h-4" />
              </button>
            }
          />
        </div>

        {/* Desktop: Sub nav — lg: extra px so nav links sit inside max-width area */}
        <div className="hidden md:flex items-center gap-1 px-6 py-1.5 border-t lg:px-8 xl:px-14" style={{ borderColor:'var(--kryros-border)', background:'var(--kryros-secondary-bg)' }}>
          {desktopNav.map(({ label, href }) => {
            const isActive = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <button
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={isActive
                    ? { background:'var(--kryros-primary)', color:'var(--kryros-white-text)' }
                    : { color:'var(--kryros-primary-text)' }
                  }
                  onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color='var(--kryros-primary)'; (e.currentTarget as HTMLButtonElement).style.background='var(--kryros-white)'; } }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color='var(--kryros-primary-text)'; (e.currentTarget as HTMLButtonElement).style.background='transparent'; } }}
                >
                  {label}
                </button>
              </Link>
            );
          })}
          <span className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors" style={{ background:'var(--kryros-primary)', color:'var(--kryros-white-text)' }}>
            Hot Deals
          </span>
        </div>
        </header>
      </div>



      {/* Spacer: keeps content below the fixed header */}
      <div style={{ height: headerHeight }} className="bg-background" />
    </>
  );
}
