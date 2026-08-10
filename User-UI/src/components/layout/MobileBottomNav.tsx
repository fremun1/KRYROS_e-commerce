import { Link, useLocation } from "wouter";
import { Home, Grid, CreditCard, PackageSearch, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSidebarStore } from "@/store/sidebarStore";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.qty, 0));
  const sidebarOpen = useSidebarStore((s) => s.open);

  const active = (path: string) => location === path;

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Shop", href: "/shop", icon: Grid },
    { label: "Pay", href: "/pay", icon: CreditCard },
    { label: "Track", href: "/track", icon: PackageSearch },
    { label: "Cart", href: "/cart", icon: ShoppingCart, count: cartCount },
  ];

  if (sidebarOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = active(item.href);
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 no-underline group"
            >
              <div className="relative">
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className="transition-colors duration-200"
                  style={{ color: isActive ? 'var(--kryros-primary)' : 'var(--kryros-secondary-text)' }}
                />
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1.5 -right-2 text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 border border-white" style={{ background:'var(--kryros-primary)', color:'var(--kryros-white-text)' }}>
                    {item.count > 9 ? "9+" : item.count}
                  </span>
                )}
              </div>
              <span 
                className="text-[10px] font-bold transition-colors duration-200"
                style={{ color: isActive ? 'var(--kryros-primary)' : 'var(--kryros-secondary-text)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
