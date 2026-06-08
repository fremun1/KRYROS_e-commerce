import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  ShoppingBag, Heart, User, Sun, Moon, Globe, Menu, Mic, ChevronDown, LogOut, LayoutDashboard, X,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useThemeStore } from "@/store/themeStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { useAuthStore } from "@/store/authStore";
import { API_BASE } from "@/lib/api";
import Sidebar from "./Sidebar";
import SearchAutocomplete from "./SearchAutocomplete";

const DEFAULT_NAV = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Get Now", href: "/get-now" },
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
  const [headerCfg, setHeaderCfg] = useState<HeaderConfig | null>(null);
  const [announceHidden, setAnnounceHidden] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(52);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/cms/site-config/header`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.value) setHeaderCfg(d.value); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const obs = new ResizeObserver(() => setHeaderHeight(headerRef.current?.offsetHeight ?? 52));
    obs.observe(headerRef.current);
    setHeaderHeight(headerRef.current.offsetHeight || 52);
    return () => obs.disconnect();
  }, []);

  const desktopNav = (headerCfg?.navLinks || DEFAULT_NAV).filter((l: any) => l.isActive !== false);
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebarStore();
  const [location] = useLocation();
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((t, i) => t + i.qty, 0);
  const wishlist = useWishlistStore((s) => s.items);
  const { theme, toggleTheme } = useThemeStore();

  const { currencies, selected, setCurrency } = useCurrencyStore();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { user, token, logout } = useAuthStore();
  const isLoggedIn = !!(token && user);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* FIXED header wrapper — always at top of viewport */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-40">
        {/* Announcement bar — always visible, dismissible with X */}
        {headerCfg?.announcementEnabled && headerCfg?.announcementText && !announceHidden && (
          <div
            className="bg-background text-foreground text-[10px] md:text-xs border-b border-border"
            style={{
              ...(headerCfg?.announcementBgColor ? { backgroundColor: headerCfg.announcementBgColor } : {}),
              ...(headerCfg?.announcementTextColor ? { color: headerCfg.announcementTextColor } : {}),
            }}
          >
            <div className="flex items-center justify-between px-4 md:px-6 py-1.5 md:py-2">
              <span>
                {headerCfg?.announcementText}
              </span>
              <div className="flex items-center gap-2">
                <Link href={headerCfg?.announcementCtaLink || "/track"}>
                  <span className="flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity font-medium">
                    {headerCfg?.announcementCta || "›"} <span className="text-[10px]">&rsaquo;</span>
                  </span>
                </Link>
                <button
                  onClick={() => setAnnounceHidden(true)}
                  className="p-0.5 rounded hover:bg-white/20 transition-colors ml-1 flex-shrink-0"
                  aria-label="Dismiss announcement"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
          {/* Main header row */}
        {/* Main header row */}
        <div className="flex items-center gap-2 px-3 md:px-6 h-[52px] md:h-[68px]">
          {/* Hamburger */}
          <button
            data-testid="header-menu-btn"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 md:p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/">
            <span className="text-lg md:text-2xl font-black tracking-tight cursor-pointer flex-shrink-0">
              KRY<span className="text-primary">ROS</span>
            </span>
          </Link>

          {/* Desktop: Category dropdown + Search bar */}
          <div className="hidden md:flex flex-1 items-center gap-2 mx-4">
            <button className="flex items-center gap-2 px-3 py-2.5 bg-primary text-white rounded-xl text-sm font-medium flex-shrink-0 hover:bg-primary/90 transition-colors">
              <Menu className="w-4 h-4" />
              All Categories
              <ChevronDown className="w-4 h-4" />
            </button>
            <SearchAutocomplete
              showSearchButton
              placeholder="Search for products, brands and more..."
            />
          </div>

          {/* Spacer mobile */}
          <div className="flex-1 md:hidden" />

          {/* Desktop: Right icons */}
          <div className="hidden md:flex items-center gap-0.5">
            {/* Currency selector */}
            <div className="relative">
              <button
                onClick={() => { setCurrencyOpen(!currencyOpen); setUserMenuOpen(false); }}
                className="flex items-center gap-1 px-2 py-2 rounded-xl hover:bg-muted transition-colors text-sm text-muted-foreground"
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

            <button className="flex items-center gap-1 px-2 py-2 rounded-xl hover:bg-muted transition-colors text-sm text-muted-foreground">
              <Globe className="w-4 h-4" /><span>EN</span><ChevronDown className="w-3 h-3" />
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-muted transition-colors" data-testid="theme-toggle">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User menu */}
            <div className="relative">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => { setUserMenuOpen(!userMenuOpen); setCurrencyOpen(false); }}
                    className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black">
                      {user.firstName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
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
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors text-destructive border-t border-border"
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
                  <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                </Link>
              )}
            </div>

            <Link href="/wishlist">
              <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlist.length > 9 ? "9+" : wishlist.length}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/cart">
              <button className="relative p-2 rounded-xl hover:bg-muted transition-colors" data-testid="cart-icon">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
                <button className="p-1.5 rounded-xl hover:bg-muted transition-colors">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black">
                    {user.firstName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                </button>
              </Link>
            ) : (
              <Link href="/login">
                <button className="p-1.5 rounded-xl hover:bg-muted transition-colors"><User className="w-5 h-5" /></button>
              </Link>
            )}
            <Link href="/wishlist">
              <button className="relative p-1.5 rounded-xl hover:bg-muted transition-colors">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlist.length > 9 ? "9+" : wishlist.length}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/cart">
              <button className="relative p-1.5 rounded-xl hover:bg-muted transition-colors">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>

        {/* Mobile: Always-visible search bar */}
        <div className="md:hidden px-3 pb-2.5">
          <SearchAutocomplete
            placeholder="Search for products, brands and more..."
            rightSlot={
              <button type="button" className="px-3 py-2 text-muted-foreground">
                <Mic className="w-4 h-4" />
              </button>
            }
          />
        </div>

        {/* Desktop: Sub nav */}
        <div className="hidden md:flex items-center gap-1 px-6 py-1.5 border-t border-border/50 bg-muted/30">
          {desktopNav.map(({ label, href }) => {
            const isActive = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <button className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  {label}
                </button>
              </Link>
            );
          })}
          <span className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold text-primary bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors">
            Hot Deals
          </span>
        </div>
        </header>
      </div>

      {/* Spacer: keeps content below the fixed header */}
      <div style={{ height: headerHeight }} />
    </>
  );
}
