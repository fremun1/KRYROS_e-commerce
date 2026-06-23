import { Link, useLocation } from "wouter";
import { Home, Grid, CreditCard, PackageSearch, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useEffect, useRef, useState } from "react";

const TEAL = "#26A69A";
const GRAY = "#9CA3AF";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.qty, 0));
  const sidebarOpen = useSidebarStore((s) => s.open);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) setVisible(true);
      else if (currentY > lastScrollY.current + 4) setVisible(false);
      else if (currentY < lastScrollY.current - 4) setVisible(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const active = (path: string) => location === path;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        transition: "transform 0.3s ease",
        transform:
          visible && !sidebarOpen
            ? "translateY(0)"
            : "translateY(calc(100% + env(safe-area-inset-bottom)))",
      }}
    >
      <div
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "14px",
          paddingRight: "14px",
        }}
      >
        {/* Wrapper — tall enough so the floating Pay circle has room above the bar */}
        <div
          style={{
            position: "relative",
            marginBottom: "10px",
            height: "76px",
          }}
        >
          {/* Glow behind Pay circle */}
          <div
            style={{
              position: "absolute",
              top: "0px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(38,166,154,0.30) 0%, rgba(38,166,154,0.12) 50%, transparent 72%)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          {/* Rectangular bar with gently rounded corners */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "54px",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "stretch",
              zIndex: 1,
              overflow: "visible",
            }}
          >
            {/* Home */}
            <Link
              href="/"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "4px",
                paddingBottom: "6px",
                textDecoration: "none",
              }}
            >
              <Home
                strokeWidth={1.6}
                width={24}
                height={24}
                color={active("/") ? TEAL : GRAY}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: active("/") ? TEAL : GRAY,
                  lineHeight: 1,
                }}
              >
                Home
              </span>
            </Link>

            {/* Shop */}
            <Link
              href="/shop"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "4px",
                paddingBottom: "6px",
                textDecoration: "none",
              }}
            >
              <Grid
                strokeWidth={1.6}
                width={24}
                height={24}
                color={active("/shop") ? TEAL : GRAY}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: active("/shop") ? TEAL : GRAY,
                  lineHeight: 1,
                }}
              >
                Shop
              </span>
            </Link>

            {/* Pay — centre slot, only label visible in bar; circle floats above */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: TEAL,
                  lineHeight: 1,
                }}
              >
                Pay
              </span>
            </div>

            {/* Track */}
            <Link
              href="/track"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "4px",
                paddingBottom: "6px",
                textDecoration: "none",
              }}
            >
              <PackageSearch
                strokeWidth={1.6}
                width={24}
                height={24}
                color={active("/track") ? TEAL : GRAY}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: active("/track") ? TEAL : GRAY,
                  lineHeight: 1,
                }}
              >
                Track
              </span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "4px",
                paddingBottom: "6px",
                textDecoration: "none",
              }}
            >
              <div style={{ position: "relative" }}>
                <ShoppingCart
                  strokeWidth={1.6}
                  width={24}
                  height={24}
                  color={active("/cart") ? TEAL : GRAY}
                />
                {cartCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-5px",
                      right: "-7px",
                      background: TEAL,
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 700,
                      minWidth: "16px",
                      height: "16px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                      border: "2px solid #fff",
                    }}
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: active("/cart") ? TEAL : GRAY,
                  lineHeight: 1,
                }}
              >
                Cart
              </span>
            </Link>
          </div>

          {/* Floating Pay circle — 40px, same as WhatsApp button */}
          <Link
            href="/pay"
            style={{
              position: "absolute",
              top: "14px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: TEAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(38,166,154,0.45), 0 2px 6px rgba(38,166,154,0.25)",
              zIndex: 3,
              textDecoration: "none",
            }}
          >
            <CreditCard strokeWidth={2} width={20} height={20} color="#fff" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
