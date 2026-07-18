import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { inferPageContext, getScopedBrowsePath } from "@/lib/pageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Home, ShoppingBag, Zap, Package, MapPin, Truck, Info, Phone, Shield, FileText, RefreshCw,
  ChevronRight, Search, Grid2x2, Globe, Moon, Sun, DollarSign, ChevronDown, LogOut, User, Heart, LayoutDashboard
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
  const [catSearch, setCatSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    account: true,
    browse: true,
    categories: true,
    preferences: true,
    info: true,
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const pageContext = inferPageContext(location);
  const { theme, toggleTheme } = useThemeStore();

  const { currencies, selected, setCurrency, fetchCurrencies } = useCurrencyStore();
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

  useEffect(() => {
    if (categories.length === 0) return;

    setExpandedCategories((prev) => {
      const next = { ...prev };
      let changed = false;

      categories.forEach((cat) => {
        const key = String(cat.id);
        if (next[key] === undefined) {
          next[key] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [categories]);

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !(prev[section] ?? true),
    }));
  };

  const toggleCategory = (categoryId: string | number) => {
    const key = String(categoryId);
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  const navigateTo = (path: string) => {
    onClose();
    setLocation(path);
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
                <span className="flex items-center gap-2 text-xl font-black tracking-tight">
                  <img
                    src="/kryros-logo.png"
                    alt="KRYROS"
                    className="w-8 h-8 object-contain"
                    loading="eager"
                    decoding="async"
                  />
                  <span>
                    KRY<span className="text-primary">ROS</span>
                  </span>
                </span>
              </Link>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content - Unified Accordion Menu */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                
                {/* MY ACCOUNT Section */}
                <div className="border-b border-border/50 last:border-0">
                  <button 
                    onClick={() => toggleSection("account")}
                    className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-primary" />
                      <span>My Account</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedSections.account ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {expandedSections.account && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-muted/20"
                      >
                        <div className="pb-2">
                          <Link href="/dashboard" onClick={onClose}>
                            <div className="flex items-center gap-3 px-10 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                              <LayoutDashboard className="w-4 h-4" />
                              <span>Dashboard</span>
                            </div>
                          </Link>
                          <Link href="/wishlist" onClick={onClose}>
                            <div className="flex items-center gap-3 px-10 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                              <Heart className="w-4 h-4" />
                              <span>Wishlist</span>
                            </div>
                          </Link>
                          {token && (
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-10 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors cursor-pointer">
                              <LogOut className="w-4 h-4" />
                              <span>Logout</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* BROWSE / MAIN MENU Section */}
                <div className="border-b border-border/50 last:border-0">
                  <button 
                    onClick={() => toggleSection("browse")}
                    className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      <span>Browse Store</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedSections.browse ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {expandedSections.browse && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-muted/20"
                      >
                        <div className="pb-2">
                          {menuItems.map(({ label, icon: Icon, href }) => (
                            <Link key={href} href={href} onClick={onClose}>
                              <div className="flex items-center gap-3 px-10 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                                <Icon className="w-4 h-4" />
                                <span>{label}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* CATEGORIES Section */}
                <div className="border-b border-border/50 last:border-0">
                  <button 
                    onClick={() => toggleSection("categories")}
                    className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Grid2x2 className="w-5 h-5 text-primary" />
                      <span>Our Categories</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedSections.categories ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {expandedSections.categories && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-muted/20"
                      >
                        <div className="p-3">
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search categories..."
                              value={catSearch}
                              onChange={(e) => setCatSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-0.5">
                            {filteredCats.map((cat) => {
                              const catBrands = brandsByCategory[cat.id] || [];
                              const isCatExpanded = expandedCategories[String(cat.id)] ?? true;
                              const categoryPath = getScopedBrowsePath(pageContext, 'category', cat.slug || String(cat.id));
                              return (
                                <div key={cat.id}>
                                  <div className="flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => navigateTo(categoryPath)}
                                      className="flex-grow flex items-center px-4 py-2.5 rounded-l-lg hover:bg-muted transition-colors text-foreground text-sm font-medium text-left"
                                    >
                                      {cat.name}
                                    </button>
                                    {catBrands.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleCategory(cat.id)}
                                        className="px-3 py-2.5 rounded-r-lg hover:bg-muted transition-colors border-l border-border/10"
                                      >
                                        <ChevronRight
                                          className={`w-3 h-3 transition-transform ${isCatExpanded ? "rotate-90" : ""}`}
                                        />
                                      </button>
                                    )}
                                  </div>
                                  {isCatExpanded && catBrands.length > 0 && (
                                    <div className="pl-6 space-y-1 mt-1 mb-2 border-l-2 border-primary/20 ml-4">
                                      {catBrands.map((brand) => {
                                        const brandPath = getScopedBrowsePath(pageContext, 'brand', brand.slug || String(brand.id));
                                        return (
                                          <button
                                            key={brand.id}
                                            type="button"
                                            onClick={() => navigateTo(brandPath)}
                                            className="w-full px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-foreground text-xs cursor-pointer text-left"
                                          >
                                            {brand.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* PREFERENCES Section */}
                <div className="border-b border-border/50 last:border-0">
                  <button 
                    onClick={() => toggleSection("preferences")}
                    className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary" />
                      <span>Preferences</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedSections.preferences ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {expandedSections.preferences && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-muted/20"
                      >
                        <div className="pb-2">
                          {/* Currency */}
                          <div className="relative">
                            <button
                              onClick={() => setCurrencyOpen((prev) => !prev)}
                              className="w-full flex items-center justify-between px-10 py-3 hover:bg-muted transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3 text-foreground">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-sm font-medium">Currency</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                <span>{selected.code}</span>
                                <ChevronRight className={`w-3 h-3 transition-transform ${currencyOpen ? "rotate-90" : ""}`} />
                              </div>
                            </button>
                            {currencyOpen && (
                              <div className="mx-10 my-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto z-10">
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
                          {/* Theme */}
                          <div className="flex items-center justify-between px-10 py-3 hover:bg-muted transition-colors cursor-pointer" onClick={toggleTheme}>
                            <div className="flex items-center gap-3 text-foreground">
                              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                              <span className="text-sm font-medium">Theme</span>
                            </div>
                            <div className={`w-9 h-5 rounded-full transition-all duration-300 relative ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${theme === "dark" ? "left-[18px]" : "left-0.5"}`} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* INFORMATION Section */}
                <div className="border-b border-border/50 last:border-0">
                  <button 
                    onClick={() => toggleSection("info")}
                    className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Info className="w-5 h-5 text-primary" />
                      <span>Need Help?</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedSections.info ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {expandedSections.info && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-muted/20"
                      >
                        <div className="pb-2">
                          {infoItems.map(({ label, icon: Icon, href }) => (
                            <Link key={href} href={href} onClick={onClose}>
                              <div className="flex items-center gap-3 px-10 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                                <Icon className="w-4 h-4" />
                                <span>{label}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
