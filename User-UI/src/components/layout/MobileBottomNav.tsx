import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, CreditCard, Truck, Heart } from "lucide-react";
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
    { label: "Home",  icon: Home,          href: "/" },
    { label: "Shop",  icon: ShoppingBag,   href: "/shop" },
    { label: "Pay",   icon: CreditCard,    href: "/pay" },
    { label: "Track", icon: Truck,        href: "/track" },
    { label: "Cart",  icon: Heart,        href: "/cart", badge: cartCount },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300"
      style={{ transform: visible && !sidebarOpen ? "translateY(0)" : "translateY(110%)" }}
    >
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="nav-wrapper">
          <div className="nav-bar">
            <div className="nav-notch"></div>
            <button className="pay-btn" aria-label="Pay">
              <CreditCard className="w-[10px] h-[10px] text-white" />
            </button>
            {navItems.map(({ label, icon: Icon, href, badge }) => {
              const isActive = location === href || (href !== "/" && location.startsWith(href));
              const isPay = href === "/pay";

              if (isPay) {
                return (
                  <Link key={href} href={href}>
                    <div className="pay-label-item">
                      <span className="pay-label">{label}</span>
                    </div>
                  </Link>
                );
              }

              return (
                <Link key={href} href={href}>
                  <button className={`nav-item ${isActive ? 'active' : ''}`}>
                    <div className="icon-wrapper">
                      <Icon
                        className="icon"
                        style={{
                          color: isActive ? "#1dbcb8" : "#8a96a3",
                          stroke: isActive ? "#1dbcb8" : "#8a96a3"
                        }}
                      />
                      {badge != null && badge > 0 && (
                        <span className="cart-badge">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                    <span className="label">{label}</span>
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