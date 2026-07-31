import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { inferPageContext, getScopedBrowsePath } from "@/lib/pageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Home, ShoppingBag, Zap, Package, MapPin, Truck, Info, Phone, Shield, FileText, RefreshCw,
  ChevronRight, Search, Grid2x2, Globe, DollarSign, ChevronDown, LogOut, User, Heart, LayoutDashboard
} from "lucide-react";
import { useCurrencyStore } from "@/store/currencyStore";
import { useAuthStore } from "@/store/authStore";
import { EFFECTIVE_API_BASE } from "@/lib/api";

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
  const [, setLocation] = useLocation();
  const { currency } = useCurrencyStore();
  const { token, user, logout } = useAuthStore();
  const isLoggedIn = !!(token && user);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    browse: true,
    brands: true,
    info: true,
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          fetch(`${EFFECTIVE_API_BASE}/api/categories?active=true`),
          fetch(`${EFFECTIVE_API_BASE}/api/brands?active=true`),
        ]);
        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(Array.isArray(catsData) ? catsData : catsData.data || []);
        }
        if (brandsRes.ok) {
          const brandsData = await brandsRes.json();
          setBrands(Array.isArray(brandsData) ? brandsData : brandsData.data || []);
        }
      } catch {
        // Silently fail to keep sidebar usable
      }
    };
    fetchData();
  }, [open]);

  // Flatten categories into a single list without hierarchy
  const flatCategories = useMemo(() => {
    if (!categories.length) return [];
    return categories.flatMap((cat) => {
      if (cat.subcategories && cat.subcategories.length > 0) {
        return [cat, ...cat.subcategories];
      }
      return [cat];
    });
  }, [categories]);

  // Track which categories have brands
  const categoriesWithBrands = useMemo(() => {
    const categoryIds = new Set(
      brands
        .filter((b) => b.categoryId !== null && b.categoryId !== undefined)
        .map((b) => String(b.categoryId))
    );
    return categoryIds;
  }, [brands]);

  // Auto-expand category sections that have brands
  useEffect(() => {
    if (categories.length > 0 && brands.length > 0) {
      setExpandedCategories((prev) => {
        const next = { ...prev };
        let changed = false;
        categories.forEach((cat) => {
          const catId = String(cat.id);
          if (categoriesWithBrands.has(catId) && prev[catId] === undefined) {
            next[catId] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [categories, categoriesWithBrands]);

  const handleLogout = async () => {
    onClose();
    await logout();
    // Force redirect to login page
    setLocation('/login');
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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-full max-w-md bg-white z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-border z-10">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-[-0.5px]">
                    <span className="text-[#313133]">KRY</span><span className="text-[#C0151B]">ROS</span>
                  </h1>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="px-4 pb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        navigateTo(`/shop?search=${encodeURIComponent(e.currentTarget.value)}`);
                      }
                    }}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Currency Selector */}
              <div className="px-4 pb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <select
                  value={currency}
                  onChange={(e) => useCurrencyStore.getState().setCurrency(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="ZMW">ZMW (K)</option>
                </select>
              </div>
            </div>

            {/* USER SECTION */}
            {isLoggedIn && (
              <div className="border-b border-border/50 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500">{user.email || user.phone}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Link href="/dashboard" onClick={onClose}>
                    <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </div>
                  </Link>
                  <Link href="/wishlist" onClick={onClose}>
                    <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                      <Heart className="w-4 h-4" />
                      <span>Wishlist</span>
                    </div>
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}

            {/* MAIN MENU */}
            <div className="border-b border-border/50 p-4">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose}>
                  <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                    <item.icon className="w-5 h-5 text-primary" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* BROWSE / MAIN MENU Section */}
            <div className="border-b border-border/50 last:border-0">
              <button 
                onClick={() => toggleSection("browse")}
                className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <span>Browse</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.browse ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expandedSections.browse && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      {flatCategories.map((cat) => {
                        const hasBrands = categoriesWithBrands.has(String(cat.id));
                        return (
                          <div key={cat.id}>
                            <div className="flex items-center justify-between">
                              <Link
                                href={getScopedBrowsePath(cat.slug, 'category')}
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                              >
                                {cat.name}
                              </Link>
                              {hasBrands && (
                                <button
                                  onClick={() => toggleCategory(cat.id)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                  <ChevronDown className={`w-3 h-3 transition-transform ${expandedCategories[cat.id] ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                            </div>
                            {hasBrands && expandedCategories[cat.id] && (
                              <div className="pl-8 space-y-1">
                                {brands
                                  .filter((b) => String(b.categoryId) === String(cat.id))
                                  .map((brand) => (
                                    <Link
                                      key={brand.id}
                                      href={getScopedBrowsePath(brand.slug, 'brand')}
                                      onClick={onClose}
                                      className="block px-4 py-2 text-sm text-gray-600 hover:bg-muted transition-colors cursor-pointer"
                                    >
                                      {brand.name}
                                    </Link>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BRANDS Section */}
            <div className="border-b border-border/50 last:border-0">
              <button 
                onClick={() => toggleSection("brands")}
                className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Grid2x2 className="w-5 h-5 text-primary" />
                  <span>Brands</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.brands ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expandedSections.brands && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      {brands.map((brand) => (
                        <Link
                          key={brand.id}
                          href={getScopedBrowsePath(brand.slug, 'brand')}
                          onClick={onClose}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          {brand.name}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* INFO Section */}
            <div className="border-b border-border/50 last:border-0">
              <button 
                onClick={() => toggleSection("info")}
                className="w-full flex items-center justify-between px-4 py-4 text-sm font-bold text-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-primary" />
                  <span>Information</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.info ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expandedSections.info && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      {infoItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={onClose}>
                          <div className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
