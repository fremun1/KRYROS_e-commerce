import { Link, useLocation } from "wouter";
import { Home, Grid2x2, CreditCard, PackageSearch, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useEffect, useRef, useState } from "react";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.qty, 0));
  const sidebarOpen = useSidebarStore((s) => s.open);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) {
        setVisible(true);
      } else if (currentY > lastScrollY.current + 4) {
        setVisible(false);
      } else if (currentY < lastScrollY.current - 4) {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Shop", icon: Grid2x2, href: "/shop" },
    { label: "Pay", icon: CreditCard, href: "/pay" },
    { label: "Track", icon: PackageSearch, href: "/track" },
    { label: "Cart", icon: ShoppingCart, href: "/cart", badge: cartCount },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300"
      style={{
        transform: visible && !sidebarOpen ? "translateY(0)" : "translateY(110%)",
      }}
    >
      <div className="relative px-3 pb-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        <div className="bg-card/97 backdrop-blur-xl rounded-[28px] shadow-2xl border border-border/60">
          <div className="flex items-center justify-around py-2.5">
            {navItems.map(({ label, icon: Icon, href, badge }) => {
              const isActive = location === href || (href !== "/" && location.startsWith(href));
              const isPay = href === "/pay";

              if (isPay) {
                // Raised floating circle treatment for the center "Pay" tab — kept small enough to clear the screen edge when the bar hides on scroll
                return (
                  <Link key={href} href={href}>
                    <button className="flex flex-col items-center gap-1 px-3 -mt-6 relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                          isActive ? "bg-primary shadow-primary/40" : "bg-primary/90"
                        }`}
                        style={{ boxShadow: "0 6px 16px rgba(39, 185, 175, 0.35)" }}
                      >
                        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <span className={`text-[10px] font-medium leading-tight ${isActive ? "text-primary" : "text-muted-foreground"}`}>
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
                        className={`w-5 h-5 transition-all duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {badge != null && badge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors duration-200 leading-tight ${isActive ? "text-primary" : "text-muted-foreground"}`}>
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
