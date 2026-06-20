import { Link, useLocation } from "wouter";
import { Home, Grid2x2, CreditCard, PackageSearch, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useEffect, useRef, useState } from "react";

const NAV_H = 72; // px height of the bar
const CIRCLE_R = 32; // radius of the raised Pay circle (diameter = 64px)

export default function MobileBottomNav() {
  const [location] = useLocation();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.qty, 0));
  const sidebarOpen = useSidebarStore((s) => s.open);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

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
    { label: "Home",  icon: Home,          href: "/" },
    { label: "Shop",  icon: Grid2x2,       href: "/shop" },
    { label: "Pay",   icon: CreditCard,    href: "/pay" },
    { label: "Track", icon: PackageSearch, href: "/track" },
    { label: "Cart",  icon: ShoppingCart,  href: "/cart", badge: cartCount },
  ];

  const isPayActive = location === "/pay";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300"
      style={{ transform: visible && !sidebarOpen ? "translateY(0)" : "translateY(110%)" }}
    >
      {/* Safe-area padding wrapper */}
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* Main nav container with notch for Pay button */}
        <div className="relative" style={{ height: NAV_H + 16 }}>
          {/* Background bar with notch using SVG */}
          <svg
            viewBox={`0 0 375 ${NAV_H + 16}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            style={{
              filter: "drop-shadow(0 -4px 16px rgba(0,0,0,0.08))"
            }}
          >
            {/* Main bar path with smooth notch */}
            <path
              d={`
                M 0,16
                Q 0,0 20,0
                L 145,0
                Q 162,0 165,12
                A ${CIRCLE_R + 8},${CIRCLE_R + 8} 0 0 0 210,12
                Q 213,0 230,0
                L 355,0
                Q 375,0 375,16
                L 375,${NAV_H + 16}
                L 0,${NAV_H + 16}
                Z
              `}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth="0.5"
            />
          </svg>

          {/* Nav items container */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-around px-2"
            style={{ height: NAV_H + 16 }}>

            {navItems.map(({ label, icon: Icon, href, badge }) => {
              const isActive = location === href || (href !== "/" && location.startsWith(href));
              const isPay = href === "/pay";

              if (isPay) {
                return (
                  <Link key={href} href={href}>
                    <button
                      className="flex flex-col items-center gap-1.5 transition-all duration-200"
                      style={{ marginTop: -(CIRCLE_R + 12) }}
                    >
                      {/* Circular Pay button */}
                      <div
                        className="flex items-center justify-center rounded-full transition-all duration-200 shadow-lg"
                        style={{
                          width: CIRCLE_R * 2,
                          height: CIRCLE_R * 2,
                          background: "var(--kryros-primary)",
                          boxShadow: "0 8px 24px rgba(39, 185, 175, 0.4)",
                        }}
                      >
                        <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                      </div>
                      <span
                        className="text-xs font-bold leading-tight transition-colors duration-200"
                        style={{ color: "var(--kryros-primary)" }}
                      >
                        {label}
                      </span>
                    </button>
                  </Link>
                );
              }

              return (
                <Link key={href} href={href}>
                  <button className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200 relative">
                    <div className="relative p-2 rounded-lg transition-all duration-200">
                      <Icon
                        className="w-6 h-6 transition-all duration-200"
                        style={{ color: isActive ? "var(--kryros-primary)" : "var(--muted-foreground)" }}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {badge != null && badge > 0 && (
                        <span
                          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-5 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none"
                          style={{ background: "var(--kryros-primary)" }}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-semibold transition-colors duration-200 leading-tight"
                      style={{ color: isActive ? "var(--kryros-primary)" : "var(--muted-foreground)" }}
                    >
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
