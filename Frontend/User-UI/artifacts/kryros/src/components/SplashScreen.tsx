import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show for at least 1.8 seconds, then fade out over 400ms
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1800);
    const doneTimer = setTimeout(() => {
      onDone();
    }, 2200);
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
      {/* Pulsing rings around logo */}
      <div
        style={{
          position: "relative",
          width: 140,
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              borderRadius: "50%",
              border: `${i === 1 ? "2px" : "1.5px"} solid rgba(var(--kryros-primary-rgb),${0.5 - i * 0.12})`,
              width: 54 + i * 26,
              height: 54 + i * 26,
              animation: `kryros-pulse-ring 2s ease-out ${(i - 1) * 0.35}s infinite`,
            }}
          />
        ))}

        {/* KRYROS Logo */}
        <img
          src="/kryros-logo.png"
          alt="KRYROS"
          style={{
            width: 60,
            height: 60,
            objectFit: "contain",
            animation: "kryros-blink 1.6s ease-in-out infinite",
            zIndex: 1,
            position: "relative",
          }}
          onError={(e) => {
            // Fallback: show K letter if logo not found
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Brand name */}
      <p
        style={{
          marginTop: 28,
          color: "var(--kryros-light-card)",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "0.12em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          animation: "kryros-blink 1.6s ease-in-out 0.2s infinite",
        }}
      >
        KRYROS
      </p>

      {/* Bouncing loading dots */}
      <div style={{ display: "flex", gap: 7, marginTop: 20 }}>
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
        @keyframes kryros-pulse-ring {
          0%   { transform: scale(0.85); opacity: 0.9; }
          60%  { opacity: 0.35; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes kryros-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        @keyframes kryros-bounce {
          0%, 100% { transform: translateY(0);    opacity: 0.35; }
          50%       { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
