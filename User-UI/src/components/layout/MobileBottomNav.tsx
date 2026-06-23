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
    { label: "Track", icon: PackageSearch, href: "/track" },
    { label: "Cart", icon: ShoppingCart, href: "/cart", badge: cartCount },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300"
      style={{ transform: visible && !sidebarOpen ? "translateY(0)" : "translateY(calc(100% + env(safe-area-inset-bottom)))" }}
    >
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="relative">
          {/* Main nav container with U-notch */}
          <div className="mx-4 mb-4">
            <div className="relative">
              {/* Background with U-notch */}
              <div className="absolute inset-0 bg-white rounded-[24px] shadow-2xl -z-10"></div>
              
              {/* Notch cutout - deep enough to let button sit inside */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-20 bg-[#f8fafc] rounded-b-full rounded-t-full -z-5 -mt-4"></div>
              
              {/* Nav items */}
              <div className="flex items-end justify-around px-3 py-2">
                {/* Left items */}
                {[navItems[0], navItems[1]].map(({ label, icon: Icon, href, badge }) => {
                  const isActive = location === href || (href !== "/" && location.startsWith(href));
                  return (
                    <Link key={href} href={href}>
                      <button className={`flex flex-col items-center gap-0.5 transition-all`}>
                        <div className="relative">
                          <Icon
                            className={`w-5 h-5 transition-colors ${
                              isActive ? "text-[var(--kryros-primary)]" : "text-[#64748b]"
                            }`}
                            strokeWidth={1.8}
                          />
                          {badge != null && badge > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-[var(--kryros-primary)] text-white text-[7px] font-bold w-3 h-3 rounded-full flex items-center justify-center">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold transition-colors ${
                          isActive ? "text-[var(--kryros-primary)]" : "text-[#64748b]"
                        }`}>
                          {label}
                        </span>
                      </button>
                    </Link>
                  );
                })}

                {/* Spacer */}
                <div className="w-28 h-20"></div>

                {/* Right items */}
                {[navItems[2], navItems[3]].map(({ label, icon: Icon, href, badge }) => {
                  const isActive = location === href || (href !== "/" && location.startsWith(href));
                  return (
                    <Link key={href} href={href}>
                      <button className={`flex flex-col items-center gap-0.5 transition-all`}>
                        <div className="relative">
                          <Icon
                            className={`w-5 h-5 transition-colors ${
                              isActive ? "text-[var(--kryros-primary)]" : "text-[#64748b]"
                            }`}
                            strokeWidth={1.8}
                          />
                          {badge != null && badge > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-[var(--kryros-primary)] text-white text-[7px] font-bold w-3 h-3 rounded-full flex items-center justify-center">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold transition-colors ${
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

          {/* Floating Pay button + label - sits mostly in notch */}
          <Link href="/pay">
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 flex flex-col items-center gap-0.5">
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  location === "/pay" ? "bg-[var(--kryros-primary)] shadow-[0_6px_18px_rgba(39,185,175,0.4)]" : "bg-[var(--kryros-primary)] shadow-[0_6px_18px_rgba(39,185,175,0.25)]"
                }`}
              >
                <CreditCard
                  className="w-6 h-6 text-white"
                />
              </button>
              <span className={`text-[10px] font-semibold transition-colors ${
                location === "/pay" ? "text-[var(--kryros-primary)]" : "text-[#64748b]"
              }`}>
                Pay
              </span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
