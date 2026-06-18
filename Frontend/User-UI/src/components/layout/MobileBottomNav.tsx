import { Link, useLocation } from "wouter";
import { Home, Grid2x2, CreditCard, PackageSearch, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useEffect, useRef, useState } from "react";

const TEAL = "#27B9AF";
const NAV_H = 64; // px height of the bar
const BUMP_R = 28; // radius of the raised Pay circle

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
        {/*
          SVG notch bar — draws the white rounded rect with a smooth arch cutout
          in the center for the Pay button to sit in.
        */}
        <div className="relative" style={{ height: NAV_H + 20 }}>
          {/* Background bar with notch rendered as an inline SVG */}
          <svg
            viewBox={`0 0 375 ${NAV_H + 20}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full drop-shadow-xl"
            style={{ filter: "drop-shadow(0 -2px 12px rgba(0,0,0,0.10))" }}
          >
            <defs>
              <filter id="navShadow">
                <feDropShadow dx="0" dy="-2" stdDeviation="6" floodColor="rgba(0,0,0,0.10)" />
              </filter>
            </defs>
            {/*
              Path: start at bottom-left corner, go up to bar height,
              across to notch start, curve down into notch, curve back up,
              continue to top-right, down to bottom-right, close.
              Notch center is at x=187.5 (middle). Notch radius ~34px with padding.
            */}
            <path
              d={`
                M 0,20
                Q 0,0 20,0
                L 152,0
                Q 167,0 170,14
                A ${BUMP_R + 6},${BUMP_R + 6} 0 0 0 205,14
                Q 208,0 223,0
                L 355,0
                Q 375,0 375,20
                L 375,${NAV_H + 20}
                L 0,${NAV_H + 20}
                Z
              `}
              fill="rgba(255,255,255,0.97)"
            />
          </svg>

          {/* Nav items row — absolutely positioned over the SVG */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-around"
            style={{ height: NAV_H + 20, paddingBottom: 4 }}>

            {navItems.map(({ label, icon: Icon, href, badge }) => {
              const isActive = location === href || (href !== "/" && location.startsWith(href));
              const isPay = href === "/pay";

              if (isPay) {
                return (
                  <Link key={href} href={href}>
                    <button
                      className="flex flex-col items-center gap-1"
                      style={{ marginTop: -(BUMP_R + 10) }} /* lift the button above the bar */
                    >
                      {/* Teal circle */}
                      <div
                        className="flex items-center justify-center rounded-full transition-all duration-200"
                        style={{
                          width: BUMP_R * 2,
                          height: BUMP_R * 2,
                          background: `linear-gradient(145deg, ${TEAL} 0%, #1a9e95 100%)`,
                          boxShadow: `0 6px 20px rgba(39,185,175,0.45)`,
                        }}
                      >
                        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <span
                        className="text-[10px] font-semibold leading-tight"
                        style={{ color: isPayActive ? TEAL : "#9ca3af", marginTop: 2 }}
                      >
                        {label}
                      </span>
                    </button>
                  </Link>
                );
              }

              return (
                <Link key={href} href={href}>
                  <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative">
                    <div className="relative p-1.5 rounded-xl transition-all duration-200">
                      <Icon
                        className="w-5 h-5 transition-all duration-200"
                        style={{ color: isActive ? TEAL : "#9ca3af" }}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {badge != null && badge > 0 && (
                        <span
                          className="absolute -top-1 -right-1 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none"
                          style={{ background: TEAL }}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium transition-colors duration-200 leading-tight"
                      style={{ color: isActive ? TEAL : "#9ca3af" }}
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
