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
        className="px-[14px]"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Wrapper — tall enough so the floating Pay circle has room above the bar */}
        <div
          className="relative mb-[10px] h-[76px]"
        >
          {/* Glow behind Pay circle */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[68px] h-[68px] rounded-full pointer-events-none z-10"
            style={{
              background:
                "radial-gradient(circle, rgba(39,185,175,0.30) 0%, rgba(39,185,175,0.12) 50%, transparent 72%)",
            }}
          />

          {/* Rectangular bar with gently rounded corners */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[54px] bg-card rounded-[16px] shadow-lg flex items-stretch z-0 overflow-visible dark:shadow-xl dark:shadow-black/20"
          >
            {/* Home */}
            <Link
              href="/"
              className="flex-1 flex flex-col items-center justify-end gap-1 pb-[6px] no-underline"
            >
              <Home
                strokeWidth={1.6}
                width={24}
                height={24}
                className={active("/") ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-[11px] font-medium leading-none ${active("/") ? "text-primary" : "text-muted-foreground"}`}
              >
                Home
              </span>
            </Link>

            {/* Shop */}
            <Link
              href="/shop"
              className="flex-1 flex flex-col items-center justify-end gap-1 pb-[6px] no-underline"
            >
              <Grid
                strokeWidth={1.6}
                width={24}
                height={24}
                className={active("/shop") ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-[11px] font-medium leading-none ${active("/shop") ? "text-primary" : "text-muted-foreground"}`}
              >
                Shop
              </span>
            </Link>

            {/* Pay — centre slot, only label visible in bar; circle floats above */}
            <div
              className="flex-1 flex flex-col items-center justify-end pb-[6px]"
            >
              <span
                className="text-[11px] font-medium leading-none text-primary"
              >
                Pay
              </span>
            </div>

            {/* Track */}
            <Link
              href="/track"
              className="flex-1 flex flex-col items-center justify-end gap-1 pb-[6px] no-underline"
            >
              <PackageSearch
                strokeWidth={1.6}
                width={24}
                height={24}
                className={active("/track") ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-[11px] font-medium leading-none ${active("/track") ? "text-primary" : "text-muted-foreground"}`}
              >
                Track
              </span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="flex-1 flex flex-col items-center justify-end gap-1 pb-[6px] no-underline"
            >
              <div className="relative">
                <ShoppingCart
                  strokeWidth={1.6}
                  width={24}
                  height={24}
                  className={active("/cart") ? "text-primary" : "text-muted-foreground"}
                />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-[5px] -right-[7px] bg-primary text-white text-[9px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 border-2 border-card"
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-medium leading-none ${active("/cart") ? "text-primary" : "text-muted-foreground"}`}
              >
                Cart
              </span>
            </Link>
          </div>

          {/* Floating Pay circle — 40px, same as WhatsApp button */}
          <Link
            href="/pay"
            className="absolute top-[14px] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg z-20 no-underline"
            style={{
              boxShadow: "0 4px 14px rgba(39,185,175,0.45), 0 2px 6px rgba(39,185,175,0.25)",
            }}
          >
            <CreditCard strokeWidth={2} width={20} height={20} color="#fff" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
