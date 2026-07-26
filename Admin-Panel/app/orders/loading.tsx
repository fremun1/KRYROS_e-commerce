export default function Loading() {
  return (
    <div style={{ padding: "28px 24px", background: "var(--bg)", minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Sk h={22} w={160} />
          <Sk h={12} w={240} />
        </div>
        <Sk h={36} w={120} radius={8} />
      </div>
      {/* Search / filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Sk h={36} w={280} radius={8} />
        <Sk h={36} w={120} radius={8} />
        <Sk h={36} w={120} radius={8} />
      </div>
      {/* Table */}
      <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 24 }}>
          {[200, 120, 80, 100, 80, 60].map((w, i) => <Sk key={i} h={12} w={w} />)}
        </div>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 24, alignItems: "center" }}>
            {[200, 120, 80, 100, 80, 60].map((w, j) => <Sk key={j} h={14} w={w} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Sk({ w = "100%", h = 20, radius = 6 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      flexShrink: 0,
    }} />
  );
}
