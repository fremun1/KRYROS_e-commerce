export default function Loading() {
  return (
    <div style={{ padding: "28px 24px", background: "var(--bg)", minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: "var(--card)", borderRadius: 12, padding: 20, border: "1px solid var(--border)" }}>
            <Sk h={12} w="60%" />
            <div style={{ marginTop: 12 }}><Sk h={28} w="80%" /></div>
            <div style={{ marginTop: 8 }}><Sk h={10} w="40%" /></div>
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--card)", borderRadius: 12, padding: 20, border: "1px solid var(--border)", height: 280 }}>
          <Sk h={14} w="30%" />
          <div style={{ marginTop: 16 }}><Sk h={200} /></div>
        </div>
        <div style={{ background: "var(--card)", borderRadius: 12, padding: 20, border: "1px solid var(--border)", height: 280 }}>
          <Sk h={14} w="40%" />
          <div style={{ marginTop: 16 }}><Sk h={200} /></div>
        </div>
      </div>
      {/* Table */}
      <div style={{ background: "var(--card)", borderRadius: 12, padding: 20, border: "1px solid var(--border)" }}>
        <Sk h={14} w="20%" />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {[0,1,2,3,4].map(i => <Sk key={i} h={36} />)}
        </div>
      </div>
    </div>
  );
}

function Sk({ w = "100%", h = 20 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}
