"use client";
import { useScreenshotRestriction } from "@/hooks/useScreenshotRestriction";
import { useRegionRestriction } from "@/hooks/useRegionRestriction";
import { useMobileScreenshotProtection } from "@/hooks/useMobileScreenshotProtection";
import { usePathname } from "next/navigation";

export default function GlobalGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { enabled: screenshotBlocked } = useScreenshotRestriction();
  const { blocked: regionBlocked, loaded: regionLoaded, message: regionMessage } = useRegionRestriction();
  useMobileScreenshotProtection(screenshotBlocked);

  // Show region blocked message if enabled and user is from blocked region
  // This will now block even the login page
  if (regionLoaded && regionBlocked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f1115",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{ maxWidth: "400px" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🌍</div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px", color: "#fff" }}>
            Access Restricted
          </h1>
          <p style={{ fontSize: "16px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "24px" }}>
            {regionMessage}
          </p>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "24px 0" }} />
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        userSelect: screenshotBlocked ? 'none' : 'auto', 
        WebkitUserSelect: screenshotBlocked ? 'none' : 'auto',
        WebkitTouchCallout: screenshotBlocked ? 'none' : 'default',
        WebkitUserDrag: screenshotBlocked ? 'none' : 'auto'
      } as any}
      onContextMenu={screenshotBlocked ? (e) => e.preventDefault() : undefined}
    >
      {children}
    </div>
  );
}
