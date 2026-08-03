import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show for at least 2.5 seconds, then fade out over 300ms
    // This gives the content plenty of time to load in the background
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2500);
    const doneTimer = setTimeout(() => {
      onDone();
    }, 2800);
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
      <div
        style={{
          width: 48,
          height: 48,
          border: "4px solid var(--border)",
          borderTop: "4px solid var(--kryros-primary)", // Primary red color
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
