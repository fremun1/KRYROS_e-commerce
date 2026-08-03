import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show for at least 1.2 seconds, then fade out over 300ms
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1200);
    const doneTimer = setTimeout(() => {
      onDone();
    }, 1500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "hsl(var(--background))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.4s ease",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* KRYROS Logo — full red square, larger and more prominent */}
      <img
        src="/kryros-logo.png"
        alt="KRYROS"
        style={{
          width: 120,
          height: 120,
          objectFit: "contain",
          animation: "kryros-fade-pulse 2s ease-in-out infinite",
        }}
        onError={(e) => {
          // Fallback: show red square with K icon
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Bouncing loading dots */}
      <div style={{ display: "flex", gap: 7, marginTop: 28 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--kryros-primary)",
              animation: `kryros-bounce 0.9s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes kryros-fade-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.03); }
        }
        @keyframes kryros-bounce {
          0%, 100% { transform: translateY(0);    opacity: 0.35; }
          50%      { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
