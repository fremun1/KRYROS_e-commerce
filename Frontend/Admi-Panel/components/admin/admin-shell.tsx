"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider, useTheme } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Sidebar from "@/components/admin/sidebar";
import Topbar from "@/components/admin/topbar";

function AdminShellInner({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : true);
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === "dark";
  const sidebarW = collapsed ? 60 : 260;

  // Detect mobile ONCE and on resize — no layout flicker
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: isDark ? "#050816" : "#F8FAFC" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, margin: "0 auto 16px", border: "3px solid rgba(31,168,154,0.2)", borderTopColor: "#1FA89A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: isDark ? "#8E9AAF" : "#64748B", fontSize: 14, fontWeight: 500 }}>Loading...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Return a blank screen-coloured div instead of null to prevent white flash
  // during the async router.replace('/login') navigation
  if (!isAuthenticated) return (
    <div style={{ minHeight: '100vh', background: isDark ? '#050816' : '#F8FAFC' }} />
  );

  const mainLeft = isMobile ? 0 : sidebarW;
  const mainTop = isMobile ? 56 : 64;

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#050816" : "#F8FAFC", transition: "background-color 0.3s" }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Topbar */}
      <Topbar
        collapsed={collapsed}
        sidebarW={isMobile ? 0 : sidebarW}
        onMenuToggle={() => setCollapsed(!collapsed)}
        onMobileMenuToggle={() => setMobileOpen(true)}
      />

      {/* Main content — offset with inline styles (no CSS string interpolation = no layout flicker) */}
      <main style={{
        marginLeft: mainLeft,
        paddingTop: mainTop,
        minHeight: "100vh",
        transition: "margin-left 0.25s ease",
        overflow: "hidden",
      }}>
        {noPadding ? children : <div style={{ padding: isMobile ? "12px 16px" : "24px" }}>{children}</div>}
      </main>
    </div>
  );
}

export default function AdminShell({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminShellInner noPadding={noPadding}>{children}</AdminShellInner>
      </AuthProvider>
    </ThemeProvider>
  );
}

