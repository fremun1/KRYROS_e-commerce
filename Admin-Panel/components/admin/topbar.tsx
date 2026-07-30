"use client";
import React, { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, ChevronDown, LogOut, User, Settings, Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { getNotifications, markNotificationRead } from "@/lib/api";

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard", "/users": "Users & Roles", "/orders": "Orders",
  "/categories": "Categories", "/brands": "Brands", "/reviews": "Reviews",
  "/products": "Products", "/wholesale": "Wholesale", "/credit-system": "Credit System",
  "/wallet-payments": "Wallet & Payments", "/countries-currencies": "Countries / Currencies",
  "/locations-shipping": "Locations & Shipping", "/services": "Services",
  "/invoicing": "Invoicing", "/cms-pages": "CMS & Pages", "/notifications": "Notifications",
  "/reports": "Reports", "/settings": "Settings",
};

interface TopbarProps {
  collapsed: boolean;
  sidebarW: number;
  onMenuToggle: () => void;
  onMobileMenuToggle: () => void;
}

type NotifItem = { id: string; title: string; message: string; isRead: boolean; createdAt: string; type?: string; url?: string };

export default function Topbar({ collapsed, sidebarW, onMenuToggle, onMobileMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const bg = "var(--card)";
  const border = "var(--border)";
  const textMain = "var(--text-main)";
  const textMuted = "var(--text-muted)";
  const surface = "var(--surface)";
  const card = "var(--card)";
  const currentPage = pageNames[pathname] || "Dashboard";

  const unread = notifs.filter(n => !n.isRead).length;

  // Fetch notifications
  const fetchNotifs = async () => {
    setNotifLoading(true);
    try {
      const res: any = await getNotifications({ limit: 8 });
      const raw: any[] = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      const mapped: NotifItem[] = raw
        // The backend now correctly filters notifications for admins to only show 
        // their own messages and system-wide admin alerts (isAdminAlert: 'true').
        .map((n: any) => {
          const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
          return {
            id: n.id || String(Math.random()),
            title: n.title || n.type || "Notification",
            message: n.message || n.body || "",
            isRead: n.isRead ?? n.read ?? false,
            createdAt: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "",
            type: data?.type || n.type || "",
            url: data?.url || "",
          };
        });
      setNotifs(mapped);
    } catch {
      // silently fail — keep empty
    }
    setNotifLoading(false);
  };

  useEffect(() => { fetchNotifs(); }, []);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node) &&
        notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllRead = async () => {
    const unreadIds = notifs.filter(n => !n.isRead).map(n => n.id);
    await Promise.allSettled(unreadIds.map(id => markNotificationRead(id)));
    setNotifs(d => d.map(n => ({ ...n, isRead: true })));
  };

  const handleMarkOne = async (id: string) => {
    try { await markNotificationRead(id); } catch {}
    setNotifs(d => d.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleNotifClick = async (n: NotifItem) => {
    if (!n.isRead) handleMarkOne(n.id);
    setShowNotifMenu(false);
    
    // 1. If the notification has a specific URL (like /orders?id=...), use it.
    if (n.url) {
      router.push(n.url);
      return;
    }

    // 2. If it's a known type but no URL, use fallback paths
    if (n.type === 'NEW_ORDER') {
      router.push('/orders');
      return;
    } 
    
    if (n.type === 'USER_REGISTER') {
      router.push('/users');
      return;
    }

    // 3. Otherwise, go to the notification detail page
    router.push(`/notifications/${n.id}`);
  };

  const handleLogout = () => { setShowUserMenu(false); logout(); };
  const handleProfile = () => { setShowUserMenu(false); router.push("/settings"); };

  // Bell button (shared between desktop and mobile)
  const BellBtn = ({ size }: { size: number }) => (
    <button
      ref={bellRef}
      onClick={() => { setShowNotifMenu(v => !v); if (!showNotifMenu) fetchNotifs(); }}
      style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, background: surface, border: `1px solid ${border}`,
        borderRadius: 8, cursor: "pointer", color: showNotifMenu ? "var(--primary)" : textMuted, flexShrink: 0,
      }}
    >
      <Bell size={15} />
      {unread > 0 && (
        <div style={{
          position: "absolute", top: 5, right: 5, width: 8, height: 8,
          background: "var(--danger)", borderRadius: "50%", border: `2px solid ${bg}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "8px", color: "var(--text-white)", fontWeight: 700,
        }} />
      )}
    </button>
  );

  return (
    <>
      {/* Desktop topbar */}
      <header className="topbar-desktop" style={{
        position: "fixed", top: 0, right: 0, height: 64,
        background: bg, borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", zIndex: 40, transition: "left 0.25s ease", left: sidebarW,
      }}>
        <button onClick={onMenuToggle} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 6, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Menu size={20} />
        </button>
        <img
          src="/kryros-logo.png"
          alt="KRYROS"
          style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0 }}
        />
        <span style={{ fontSize: 15, fontWeight: 800, color: textMain, letterSpacing: "-0.3px", whiteSpace: "nowrap", flexShrink: 0 }}>
          KR<span style={{ color: "var(--primary)" }}>YROS</span>
        </span>
        <span style={{ fontSize: 11, color: textMuted, marginLeft: 2, whiteSpace: "nowrap", flexShrink: 0 }}>Admin Dashboard</span>
        <div style={{ flex: 1 }} />
        <div className="topbar-search" style={{ display: "flex", alignItems: "center", gap: 8, background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 12px", width: 200, flexShrink: 0 }}>
          <Search size={14} color={textMuted} />
          <span style={{ fontSize: 13, color: textMuted }}>Search...</span>
        </div>
        <BellBtn size={34} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", flexShrink: 0 }}
          onClick={() => setShowUserMenu(v => !v)} ref={avatarRef}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--text-white)", flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="topbar-user-info">
            <div style={{ fontSize: 12, fontWeight: 600, color: textMain, whiteSpace: "nowrap" }}>{user?.name?.split(" ")[0] || "Admin"}</div>
            <div style={{ fontSize: 10, color: textMuted }}>Super Admin</div>
          </div>
          <ChevronDown size={13} color={textMuted} style={{ transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </div>
      </header>

      {/* Mobile topbar */}
      <header className="topbar-mobile" style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 56,
        background: bg, borderBottom: `1px solid ${border}`,
        display: "none", alignItems: "center", padding: "0 14px", zIndex: 40, gap: 10,
      }}>
        <button onClick={onMobileMenuToggle} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 6, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Menu size={22} />
        </button>
        <img
          src="/kryros-logo.png"
          alt="KRYROS"
          style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }}
        />
        <span style={{ fontSize: 16, fontWeight: 800, color: textMain, letterSpacing: "-0.3px" }}>
          KR<span style={{ color: "var(--primary)" }}>YROS</span>
        </span>
        <span style={{ fontSize: 13, color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{currentPage}</span>
        <BellBtn size={34} />
        <div onClick={() => setShowUserMenu(v => !v)} style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--text-white)", flexShrink: 0, cursor: "pointer" }}>
          {user?.name?.[0]?.toUpperCase() || "A"}
        </div>
      </header>

      {/* ── Notification Dropdown ── */}
      {showNotifMenu && (
        <div ref={notifRef} style={{
          position: "fixed", top: 60, right: 12, width: 340,
          background: card, border: `1px solid ${border}`, borderRadius: 14,
          boxShadow: "0 8px 32px var(--shadow)",
          overflow: "hidden", zIndex: 9999,
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={14} color="var(--primary)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: textMain }}>Notifications</span>
              {unread > 0 && <span style={{ background: "var(--danger)", color: "var(--text-white)", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 6px" }}>{unread}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unread > 0 && (
                <button onClick={handleMarkAllRead} style={{ fontSize: 11, color: "var(--secondary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-inter)" }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => { setShowNotifMenu(false); router.push("/notifications"); }}
                style={{ fontSize: 11, color: textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-inter)" }}>
                View All
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {notifLoading ? (
              <div style={{ padding: "24px", textAlign: "center", color: textMuted, fontSize: 13 }}>Loading...</div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center" }}>
                <Bell size={24} color={textMuted} style={{ margin: "0 auto 8px", display: "block" }} />
                <div style={{ fontSize: 13, color: textMuted }}>No notifications yet</div>
              </div>
            ) : notifs.slice(0, 8).map(n => (
              <div key={n.id} 
                onClick={() => handleNotifClick(n)}
                style={{
                  padding: "12px 16px", borderBottom: `1px solid ${border}`,
                  background: n.isRead ? "transparent" : "rgba(var(--kryros-primary-rgb), 0.04)",
                  display: "flex", gap: 10, alignItems: "flex-start",
                  cursor: "pointer",
                }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.isRead ? "transparent" : "var(--primary)", flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: n.isRead ? 500 : 700, color: textMain, marginBottom: 2 }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 11.5, color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</div>}
                  {n.createdAt && <div style={{ fontSize: 10.5, color: textMuted, marginTop: 3 }}>{n.createdAt}</div>}
                </div>
                {!n.isRead && (
                  <button onClick={(e) => { e.stopPropagation(); handleMarkOne(n.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 2, flexShrink: 0 }} title="Mark as read">
                    <Check size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${border}`, textAlign: "center" }}>
            <button onClick={() => { setShowNotifMenu(false); router.push("/notifications"); }}
              style={{ fontSize: 12, color: "var(--secondary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-inter)" }}>
              Go to Notifications page →
            </button>
          </div>
        </div>
      )}

      {/* ── User dropdown ── */}
      {showUserMenu && (
        <div ref={menuRef} style={{
          position: "fixed", top: 60, right: 12, width: 200,
          background: "var(--card)",
          border: `1px solid ${border}`, borderRadius: 12,
          boxShadow: "0 8px 32px var(--shadow)",
          overflow: "hidden", zIndex: 9999,
        }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--text-white)", flexShrink: 0 }}>
                {user?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "Admin"}</div>
                <div style={{ fontSize: 11, color: textMuted }}>{user?.role || "No role assigned"}</div>
              </div>
            </div>
          </div>
          {[{ icon: User, label: "My Profile", action: handleProfile }, { icon: Settings, label: "Settings", action: handleProfile }].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 13.5, fontFamily: "var(--font-inter)", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <Icon size={15} color={textMuted} /> {label}
            </button>
          ))}
          <div style={{ height: 1, background: border }} />
          <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 13.5, fontFamily: "var(--font-inter)", fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(214,48,49,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <LogOut size={15} color="var(--danger)" /> Sign Out
          </button>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .topbar-mobile { display: none !important; } .topbar-desktop { display: flex !important; } }
        @media (max-width: 767px) { .topbar-mobile { display: flex !important; } .topbar-desktop { display: none !important; } }
        @media (max-width: 1100px) { .topbar-search { display: none !important; } }
        @media (max-width: 900px) { .topbar-user-info { display: none !important; } }
      `}</style>
    </>
  );
}
