import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, CreditCard, Truck, Heart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useEffect, useRef, useState } from "react";

const NAV_H = 48; // px height of the bar (matching HTML)
const CIRCLE_R = 20; // radius of the raised Pay circle (diameter = 40px)

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
    <div className="nav-wrapper">
      <div className="nav-bar">
        <div className="nav-notch"></div>
        <button className="pay-btn" aria-label="Pay">
          <CreditCard className="w-4 h-4 text-white" />
        </button>
        {navItems.map(({ label, icon: Icon, href, badge }) => {
          const isActive = location === href || (href !== "/" && location.startsWith(href));
          const isPay = href === "/pay";

          if (isPay) {
            return (
              <Link key={href} href={href}>
                <button
                  className="nav-item"
                  style={{ marginTop: -(CIRCLE_R + 6) }}
                >
                  <div
                    className="flex items-center justify-center rounded-full transition-all duration-200 shadow-lg"
                    style={{
                      width: CIRCLE_R * 2,
                      height: CIRCLE_R * 2,
                      background: "var(--kryros-primary)",
                      boxShadow: "0 6px 20px rgba(39, 185, 175, 0.3)",
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span
                    className="pay-label"
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
              <button
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="icon-wrapper">
                  <Icon
                    className="icon"
                    style={{ 
                      color: isActive ? "var(--kryros-primary)" : "var(--muted-foreground)",
                      stroke: isActive ? "var(--kryros-primary)" : "var(--muted-foreground)"
                    }}
                  />
                  {badge != null && badge > 0 && (
                    <span className="cart-badge">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span
                  className="label"
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
