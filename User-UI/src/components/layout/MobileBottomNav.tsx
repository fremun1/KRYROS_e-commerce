import { Link, useLocation } from "wouter";
import { Home, Grid, CreditCard, PackageSearch, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useEffect, useRef, useState } from "react";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.qty, 0));
  const sidebarOpen = useSidebarStore((s) => s.open);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) { setVisible(true); }
      else if (currentY > lastScrollY.current + 4) { setVisible(false); }
      else if (currentY < lastScrollY.current - 4) { setVisible(true); }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Shop", icon: Grid, href: "/shop" },
    { label: "Pay", icon: CreditCard, href: "/pay", isPay: true },
    { label: "Track", icon: PackageSearch, href: "/track" },
    { label: "Cart", icon: ShoppingCart, href: "/cart", badge: cartCount },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300"
      style={{ transform: visible && !sidebarOpen ? "translateY(0)" : "translateY(calc(100% + env(safe-area-inset-bottom)))" }}
    >
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="relative flex items-center justify-center mb-[-14px] z-10">
          <Link href="/pay">
            <button
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                location === "/pay" ? "bg-[var(--kryros-primary)] shadow-[0_4px_12px_rgba(39,185,175,0.35)]" : "bg-[var(--kryros-primary)] shadow-[0_4px_12px_rgba(39,185,175,0.25)]"
              }`}
            >
              <CreditCard
                className="w-8 h-8 text-white"
              />
            </button>
          </Link>
        </div>
        
        <div className="mx-4 mb-4">
          <div className="bg-white rounded-[20px] shadow-2xl px-3 py-3 flex items-center justify-around">
            {navItems.map(({ label, icon: Icon, href, badge, isPay }) => {
              if (isPay) return null;
              
              const isActive = location === href || (href !== "/" && location.startsWith(href));
              return (
                <Link key={href} href={href}>
                  <button className={`flex flex-col items-center gap-0.5 transition-all`}>
                    <div className="relative">
                      <Icon
                        className={`w-6 h-6 transition-colors ${
                          isActive ? "text-[var(--kryros-primary)]" : "text-[#64748b]"
                        }`}
                        strokeWidth={1.8}
                      />
                      {badge != null && badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-[var(--kryros-primary)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold transition-colors ${
                      isActive ? "text-[var(--kryros-primary)]" : "text-[#64748b]"
                    }`}>
                      {label}
                    </span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
