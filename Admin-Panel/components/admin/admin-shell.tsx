"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Sidebar from "@/components/admin/sidebar";
import Topbar from "@/components/admin/topbar";
import { useScreenshotRestriction } from "@/hooks/useScreenshotRestriction";
import { useRegionRestriction } from "@/hooks/useRegionRestriction";

function AdminShellInner({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  const { isAuthenticated, loading } = useAuth();
  const { enabled: screenshotBlocked, loaded: screenshotLoaded } = useScreenshotRestriction();
  const { blocked: regionBlocked, loaded: regionLoaded, message: regionMessage } = useRegionRestriction();
  const router = useRouter();
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

  // Show region blocked message if enabled and user is from blocked region
  if (regionLoaded && regionBlocked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: "400px" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🌍</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px" }}>
            Access Restricted
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {regionMessage}
          </p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "16px" }}>
            If you believe this is an error, please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, margin: "0 auto 16px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500 }}>Loading...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Return a blank screen-coloured div instead of null to prevent white flash
  // during the async router.replace('/login') navigation
  if (!isAuthenticated) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }} />
  );

  const mainLeft = isMobile ? 0 : sidebarW;
  const mainTop = isMobile ? 56 : 64;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", userSelect: screenshotBlocked ? 'none' : 'auto', WebkitUserSelect: screenshotBlocked ? 'none' : 'auto' }}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

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
    <AuthProvider>
      <AdminShellInner noPadding={noPadding}>{children}</AdminShellInner>
    </AuthProvider>
  );
}
