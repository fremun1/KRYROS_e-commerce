"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, ShoppingCart, Tag, Award, Star, Package,
  Truck, CreditCard, Wallet, Globe, MapPin, Wrench, FileText,
  Layout, Bell, BarChart3, Settings, X, ShieldCheck,
  LogOut, User, ChevronUp,
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, href: "/dashboard"            },
  { label: "Users & Roles",          icon: Users,           href: "/users"                },
  { label: "Orders",                 icon: ShoppingCart,    href: "/orders"               },
  { label: "Categories",             icon: Tag,             href: "/categories"           },
  { label: "Brands",                 icon: Award,           href: "/brands"               },
  { label: "Reviews",                icon: Star,            href: "/reviews"              },
  { label: "Products",               icon: Package,         href: "/products"             },
  { label: "Wholesale",              icon: Truck,           href: "/wholesale"            },
  { label: "Credit System",          icon: CreditCard,      href: "/credit-system"        },
  { label: "Wallet & Payments",      icon: Wallet,          href: "/wallet-payments"      },
  { label: "Countries / Currencies", icon: Globe,           href: "/countries-currencies" },
  { label: "Locations & Shipping",   icon: MapPin,          href: "/locations-shipping"   },
  { label: "Services",               icon: Wrench,          href: "/services"             },
  { label: "Invoicing",              icon: FileText,        href: "/invoicing"            },
  { label: "CMS & Pages",            icon: Layout,          href: "/cms-pages"            },
  { label: "Notifications",          icon: Bell,            href: "/notifications"        },
  { label: "Reports",                icon: BarChart3,       href: "/reports"              },
  { label: "Settings",               icon: Settings,        href: "/settings"             },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const isDark = theme === "dark";
  const [showUserPopup, setShowUserPopup] = useState(false);

  const bg = isDark ? "#0D1523" : "#FFFFFF";
  const border = isDark ? "#1E293B" : "#E2E8F0";
  const textMain = isDark ? "#FFFFFF" : "#0F172A";
  const textMuted = isDark ? "#8E9AAF" : "#64748B";
  const surface = isDark ? "#101826" : "#F8FAFC";

  const handleLogout = () => {
    setShowUserPopup(false);
    onMobileClose();
    logout();
  };

  const handleProfile = () => {
    setShowUserPopup(false);
    onMobileClose();
    router.push("/settings");
  };

  const NavList = ({ onNav }: { onNav?: () => void }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: bg, borderRight: `1px solid ${border}`, overflow: "hidden" }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "0 12px" : "0 20px",
        height: 64, borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #1FA89A, #27B9AF)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={17} color="white" />
          </div>
          {!collapsed && (
            <span style={{ fontSize: 15, fontWeight: 800, color: textMain, letterSpacing: "-0.3px" }}>
              KR<span style={{ color: "#1FA89A" }}>YROS</span>
            </span>
          )}
        </div>
        {onNav && (
          <button onClick={onNav} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 4, display: "flex", alignItems: "center" }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{ textDecoration: "none", display: "block" }}
              onClick={() => onNav && onNav()}>
              <div style={{
                display: "flex", alignItems: "center",
                gap: collapsed ? 0 : 10,
                padding: collapsed ? "10px 0" : "9px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 8, marginBottom: 1,
                background: active ? "rgba(31,168,154,0.12)" : "transparent",
                color: active ? "#1FA89A" : textMuted,
                cursor: "pointer",
              }}>
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#1FA89A" : textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {label}
                  </span>
                )}
                {active && !collapsed && (
                  <div style={{ width: 3, height: 16, background: "#1FA89A", borderRadius: 2, flexShrink: 0 }} />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── User section at bottom — NOW CLICKABLE ── */}
      {user && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          {/* User popup menu — appears above the user section */}
          {showUserPopup && !collapsed && (
            <div style={{
              position: "absolute", bottom: "100%", left: 0, right: 0,
              background: isDark ? "#0a1220" : "#FFFFFF",
              border: `1px solid ${border}`,
              borderRadius: "10px 10px 0 0",
              overflow: "hidden",
              boxShadow: isDark ? "0 -8px 24px rgba(0,0,0,0.4)" : "0 -8px 24px rgba(0,0,0,0.1)",
            }}>
              <button onClick={handleProfile} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "11px 16px", background: "none", border: "none",
                cursor: "pointer", color: textMuted, fontSize: 13.5,
                fontFamily: "var(--font-inter)",
              }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? "#101826" : "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <User size={14} /> My Profile
              </button>
              <div style={{ height: 1, background: border }} />
              <button onClick={handleLogout} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", background: "none", border: "none",
                cursor: "pointer", color: "#ef4444", fontSize: 13.5, fontWeight: 600,
                fontFamily: "var(--font-inter)",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}

          {/* Clickable user row */}
          <div
            onClick={() => setShowUserPopup(v => !v)}
            style={{
              padding: collapsed ? "12px 0" : "12px 14px",
              borderTop: `1px solid ${border}`,
              cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              gap: 10,
              background: showUserPopup ? (isDark ? "#101826" : "#F8FAFC") : "transparent",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!showUserPopup) e.currentTarget.style.background = isDark ? "#101826" : "#F8FAFC"; }}
            onMouseLeave={e => { if (!showUserPopup) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #1FA89A, #27B9AF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>
                {user.name?.[0]?.toUpperCase() || "A"}
              </div>
              {!collapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: textMuted }}>{user.role}</div>
                </div>
              )}
            </div>
            {!collapsed && (
              <ChevronUp size={14} color={textMuted} style={{ transform: showUserPopup ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.15s", flexShrink: 0 }} />
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: collapsed ? 60 : 260,
        transition: "width 0.25s ease",
        zIndex: 30, overflow: "hidden", display: "flex",
      }} className="sidebar-desktop">
        <NavList />
      </aside>

      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onMobileClose} />
          <aside style={{ position: "relative", width: 260, zIndex: 201, animation: "slideInLeft 0.2s ease" }}>
            <NavList onNav={onMobileClose} />
          </aside>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) { .sidebar-desktop { display: none !important; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}
