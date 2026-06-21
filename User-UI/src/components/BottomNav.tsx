import React, { useState } from "react";
import { Home, ShoppingBag, Truck, CreditCard, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab?: "home" | "shop" | "track" | "cart";
  onTabChange?: (tab: "home" | "shop" | "track" | "cart") => void;
  cartItemCount?: number;
}

export default function BottomNav({
  activeTab = "home",
  onTabChange,
  cartItemCount = 0,
}: BottomNavProps) {
  const [activeTabState, setActiveTabState] = useState(activeTab);

  const handleTabChange = (tab: "home" | "shop" | "track" | "cart") => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  const navItems = [
    {
      id: "home" as const,
      icon: Home,
      label: "Home",
      active: activeTabState === "home",
    },
    {
      id: "shop" as const,
      icon: ShoppingBag,
      label: "Shop",
      active: activeTabState === "shop",
    },
    {
      id: "track" as const,
      icon: Truck,
      label: "Track",
      active: activeTabState === "track",
    },
    {
      id: "cart" as const,
      icon: Heart,
      label: "Cart",
      active: activeTabState === "cart",
      hasBadge: cartItemCount > 0,
      badgeCount: cartItemCount,
    },
  ];

  return (
    <div className="nav-wrapper">
      <div className="nav-bar">
        <div className="nav-notch"></div>
        <button className="pay-btn" aria-label="Pay">
          <CreditCard className="w-4 h-4 text-white" />
        </button>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "nav-item",
              item.active && "active"
            )}
            onClick={() => handleTabChange(item.id)}
            data-tab={item.id}
          >
            <div className="icon-wrapper">
              <item.icon
                className={cn(
                  "icon",
                  item.active ? "text-[hsl(var(--kryros-primary))] stroke-[hsl(var(--kryros-primary))]" : "text-[hsl(var(--muted-foreground))] stroke-[hsl(var(--muted-foreground))]"
                )}
              />
              {item.id === "cart" && item.hasBadge && (
                <span className="cart-badge">
                  {item.badgeCount}
                </span>
              )}
            </div>
            <span
              className={cn(
                "label",
                item.active ? "text-[hsl(var(--kryros-primary))]" : "text-[hsl(var(--muted-foreground))]"
              )}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
