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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300"
      style={{ transform: visible && !sidebarOpen ? "translateY(0)" : "translateY(calc(100% + env(safe-area-inset-bottom)))" }}
    >
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div style={{
          position: "relative",
          background: "white",
          borderRadius: "50px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          display: "flex",
          alignItems: "flex-end",
          padding: "12px 20px",
          width: "340px",
          height: "70px",
          border: "1px solid rgba(0,0,0,0.05)",
          marginLeft: "auto",
          marginRight: "auto",
          marginBottom: "16px"
        }}>
          {/* Home */}
          <Link href="/">
            <a style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "6px",
              color: location === "/" ? "var(--kryros-primary)" : "#0d9488",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 500,
              height: "100%",
              paddingBottom: "4px"
            }}>
              <Home strokeWidth={1.5} width={22} height={22} />
              <span>Home</span>
            </a>
          </Link>
          
          {/* Shop */}
          <Link href="/shop">
            <a style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "6px",
              color: location === "/shop" ? "var(--kryros-primary)" : "#0d9488",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 500,
              height: "100%",
              paddingBottom: "4px"
            }}>
              <Grid strokeWidth={1.5} width={22} height={22} />
              <span>Shop</span>
            </a>
          </Link>
          
          {/* Pay (Central Floating) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", height: "100%" }}>
            <Link href="/pay">
              <a style={{
                position: "absolute",
                top: "-28px",
                background: "var(--kryros-primary)",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 16px rgba(38, 166, 154, 0.3)",
                transition: "transform 0.2s",
                zIndex: 10
              }}>
                <CreditCard strokeWidth={2} width={24} height={24} color="white" />
              </a>
            </Link>
            <span style={{
              marginTop: "auto",
              color: location === "/pay" ? "var(--kryros-primary)" : "#0d9488",
              fontSize: "11px",
              fontWeight: 500,
              paddingBottom: "4px"
            }}>Pay</span>
          </div>
          
          {/* Track */}
          <Link href="/track">
            <a style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "6px",
              color: location === "/track" ? "var(--kryros-primary)" : "#0d9488",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 500,
              height: "100%",
              paddingBottom: "4px"
            }}>
              <PackageSearch strokeWidth={1.5} width={22} height={22} />
              <span>Track</span>
            </a>
          </Link>
          
          {/* Cart */}
          <Link href="/cart">
            <a style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "6px",
              color: location === "/cart" ? "var(--kryros-primary)" : "#0d9488",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 500,
              height: "100%",
              paddingBottom: "4px"
            }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingCart strokeWidth={1.5} width={22} height={22} />
                {cartCount > 0 && (
                  <div style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--kryros-primary)",
                    color: "white",
                    fontSize: "9px",
                    width: "15px",
                    height: "15px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid white",
                    fontWeight: "bold"
                  }}>
                    {cartCount > 99 ? "99+" : cartCount}
                  </div>
                )}
              </div>
              <span>Cart</span>
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
