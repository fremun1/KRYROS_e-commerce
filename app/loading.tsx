export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#080C14",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid #1E293B",
          borderTop: "3px solid #1FA89A",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
