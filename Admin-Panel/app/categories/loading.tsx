export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg)",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <img
        src="/kryros-logo.png"
        alt="KRYROS"
        style={{
          width: 80,
          height: 80,
          objectFit: "contain",
          animation: "kryros-pulse 2s ease-in-out infinite",
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div
        style={{
          width: 28,
          height: 28,
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--primary)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes kryros-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
