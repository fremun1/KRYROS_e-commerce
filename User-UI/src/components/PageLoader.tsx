export default function PageLoader() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
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
          border: "3px solid var(--kryros-light-border)",
          borderTop: "3px solid var(--kryros-primary)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
        Loading page...
      </p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes kryros-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
