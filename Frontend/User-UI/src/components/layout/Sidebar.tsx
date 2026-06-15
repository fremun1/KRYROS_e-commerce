import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Home, ShoppingBag, Zap, Package, MapPin, Truck, Info, Phone, Shield, FileText, RefreshCw,
  ChevronRight, Search, Grid2x2, Globe, Moon, Sun, DollarSign, ChevronDown, LogOut, Tag,
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { useAuthStore } from "@/store/authStore";
import { API_BASE } from "@/lib/api";

const menuItems = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Shop", icon: ShoppingBag, href: "/shop" },
  { label: "Get Now", icon: Zap, href: "/get-now" },
  { label: "Wholesale", icon: Package, href: "/wholesale" },
  { label: "Pickup Stations", icon: MapPin, href: "/pickup-stations" },
  { label: "Track Order", icon: Truck, href: "/track" },
];

const infoItems = [
  { label: "About Us", icon: Info, href: "/about" },
  { label: "Contact Us", icon: Phone, href: "/contact" },
  { label: "Privacy Policy", icon: Shield, href: "/privacy" },
  { label: "Terms & Conditions", icon: FileText, href: "/terms" },
  { label: "Refund Policy", icon: RefreshCw, href: "/refund" },
];

interface ApiCategory {
  id: string | number;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

interface ApiBrand {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  categoryId?: number | string | null;
  category?: { id: number | string; name: string; slug: string } | null;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"menu" | "categories">("menu");
  const [catSearch, setCatSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | number | null>(null);
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useThemeStore();

  const { currencies, selected, setCurrency, fetchCurrencies } = useCurrencyStore();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { user, token, logout } = useAuthStore();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchCurrencies();

    if (categories.length === 0) {
      setCatsLoading(true);
      fetch(`${API_BASE}/api/categories/active`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        })
        .then((data) => {
          const list: ApiCategory[] = Array.isArray(data) ? data : (data.data ?? []);
          setCategories(list);
          setCatsLoading(false);
        })
        .catch(() => {
          fetch(`${API_BASE}/api/categories/homepage`)
            .then((r) => r.json())
            .then((data) => {
              const list: ApiCategory[] = Array.isArray(data) ? data : (data.data ?? []);
              setCategories(list);
            })
            .catch(() => {})
            .finally(() => setCatsLoading(false));
        });
    }

    // Fetch all brands (includes categoryId) — used for the accordion
    if (brands.length === 0) {
      fetch(`${API_BASE}/api/brands`)
        .then((r) => r.json())
        .then((data) => {
          const list: ApiBrand[] = Array.isArray(data) ? data : (data.data ?? []);
          setBrands(list);
        })
        .catch(() => {});
    }
  }, [open]);

  // Group brands by their categoryId for fast lookup
  const brandsByCategory = useMemo(() => {
    const map: Record<string | number, ApiBrand[]> = {};
    brands.forEach((b) => {
      const key = b.categoryId ?? b.category?.id;
      if (key != null) {
        if (!map[key]) map[key] = [];
        map[key].push(b);
      }
    });
    return map;
  }, [brands]);

  const filteredCats = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[88vw] md:w-[400px] bg-card flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <Link href="/" onClick={onClose}>
                <span className="text-xl font-black tracking-tight">
                  KRY<span className="text-primary">ROS</span>
                </span>
              </Link>
              <button
                onClick={onClose}
                data-testid="sidebar-close"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User strip */}
            {token && user ? (
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <Link href="/dashboard" onClick={onClose}>
                  <div className="flex items-center gap-3 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                      {user.firstName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </Link>
                <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-destructive/10 dark:hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
                <Link href="/login" onClick={onClose} className="flex-1">
                  <button className="w-full py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                    Login
                  </button>
                </Link>
                <Link href="/register" onClick={onClose} className="flex-1">
                  <button className="w-full py-2 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
                    Register
                  </button>
                </Link>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("menu")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === "menu"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid2x2 className="w-4 h-4" />
                Menu
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === "categories"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid2x2 className="w-4 h-4" />
                Categories
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "menu" ? (
                <div className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-2">Browse</p>
                  <div className="space-y-0.5">
                    {menuItems.map(({ label, icon: Icon, href }) => {
                      const isActive = location === href || (href !== "/" && location.startsWith(href));
                      return (
                        <Link key={href} href={href} onClick={onClose}>
                          <div
                            className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all cursor-pointer group ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5" />
                              <span className="text-sm font-medium">{label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-2 mt-6">Preferences</p>
                  <div className="space-y-0.5">
                    {/* Currency selector */}
                    <div className="relative">
                      <button
                        onClick={() => setCurrencyOpen(!currencyOpen)}
                        className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted cursor-pointer"
                      >
                        <div className="flex items-center gap-3 text-foreground">
                          <DollarSign className="w-5 h-5" />
                          <span className="text-sm font-medium">Currency</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <span>{selected.code} ({selected.symbol})</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${currencyOpen ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      {currencyOpen && (
                        <div className="mt-1 mx-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto z-10">
                          {currencies.map((c) => (
                            <button
                              key={c.code}
                              onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${c.code === selected.code ? "bg-primary/10 text-primary font-semibold" : "text-foreground"}`}
                            >
                              <span className="font-medium">{c.code}</span>
                              <span className="text-muted-foreground text-xs ml-auto">{c.symbol}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted cursor-pointer">
                      <div className="flex items-center gap-3 text-foreground">
                        <Globe className="w-5 h-5" />
                        <span className="text-sm font-medium">Language</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <span>English</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted cursor-pointer" onClick={toggleTheme}>
                      <div className="flex items-center gap-3 text-foreground">
                        {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        <span className="text-sm font-medium">Theme</span>
                      </div>
                      <div
                        className={`w-11 h-6 rounded-full transition-all duration-300 relative ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${theme === "dark" ? "left-[22px]" : "left-0.5"}`}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-2 mt-6">Information</p>
                  <div className="space-y-0.5">
                    {infoItems.map(({ label, icon: Icon, href }) => (
                      <Link key={href} href={href} onClick={onClose}>
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted cursor-pointer group text-foreground">
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                /* ─── CATEGORIES TAB ─── */
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 border border-border"
                    />
                  </div>

                  {catsLoading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-2 py-2.5 rounded-xl animate-pulse">
                          <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-muted rounded w-2/3" />
                            <div className="h-2.5 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredCats.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No categories found</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredCats.map((cat) => {
                        const catBrands = brandsByCategory[cat.id] ?? [];
                        const isExpanded = expandedCat === cat.id;

                        return (
                          <div key={cat.id}>
                            {/* Category row — clicking expands / collapses brands */}
                            <div
                              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted cursor-pointer group transition-all"
                            >
                              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {cat.image ? (
                                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                                {catBrands.length > 0 ? (
                                  <p className="text-xs text-muted-foreground">{catBrands.length} brand{catBrands.length !== 1 ? "s" : ""}</p>
                                ) : cat.description ? (
                                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                                ) : null}
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 text-muted-foreground opacity-60 group-hover:opacity-100 flex-shrink-0 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>

                            {/* Brands dropdown (accordion) */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-0.5 pb-2 mt-0.5">
                                    {catBrands.length === 0 ? (
                                      <p className="text-xs text-muted-foreground px-2 py-2">No brands in this category</p>
                                    ) : (
                                      catBrands.map((brand) => (
                                        <button
                                          key={brand.id}
                                          className="w-full text-left"
                                          onClick={() => {
                                            setLocation(`/shop?brand=${encodeURIComponent(brand.slug || brand.name)}`);
                                            onClose();
                                          }}
                                        >
                                          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer group transition-all">
                                            <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                                              {brand.logo ? (
                                                <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-0.5" />
                                              ) : (
                                                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                                              )}
                                            </div>
                                            <span className="text-sm text-foreground font-medium flex-1 truncate">{brand.name}</span>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-50 group-hover:opacity-100 flex-shrink-0" />
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
