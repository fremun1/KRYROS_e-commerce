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
    <div className="relative w-full max-w-[460px] mx-auto px-3">
      <div className="relative h-12 bg-white rounded-[22px] shadow-[0_6px_20px_rgba(0,0,0,0.06),_0_1px_4px_rgba(0,0,0,0.04)] flex items-center justify-around px-2 z-10">
        <div className="absolute top-[-18px] left-1/2 transform -translate-x-1/2 w-9 h-9 bg-[#eef3f7] rounded-full z-10"></div>
        <button className="absolute top-[-14px] left-1/2 transform -translate-x-1/2 w-10 h-10 bg-[#1dbcb8] rounded-full flex items-center justify-center z-20 border-none outline-none cursor-pointer" aria-label="Pay">
          <CreditCard className="w-4 h-4 text-white" />
        </button>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex flex-col items-center gap-1 cursor-pointer user-select-none relative z-30 flex-1",
              item.active && "active"
            )}
            onClick={() => handleTabChange(item.id)}
            data-tab={item.id}
          >
            <div className="relative inline-flex items-center justify-center w-3.5 h-3.5">
              <item.icon
                className={cn(
                  "w-3.5 h-3.5 transition-all duration-200",
                  item.active ? "text-[#1dbcb8] stroke-[#1dbcb8]" : "text-[#8a96a3] stroke-[#8a96a3]"
                )}
              />
              {item.id === "cart" && item.hasBadge && (
                <span className="absolute top-[-3px] right-[-3px] min-w-[10px] h-[10px] bg-[#1dbcb8] rounded-[5px] flex items-center justify-center text-[6px] font-bold text-white px-0.5">
                  {item.badgeCount}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium transition-all duration-200 tracking-[0.2px]",
                item.active ? "text-[#1dbcb8]" : "text-[#8a96a3]"
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
