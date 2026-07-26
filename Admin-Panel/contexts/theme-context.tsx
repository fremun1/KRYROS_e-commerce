"use client";
import React, { createContext, useContext } from "react";

// ── Theme context — KRYROS uses a single fixed light theme.
// Dark/light mode has been removed. This context is kept as a no-op stub
// so that any existing imports of useTheme / ThemeProvider continue to compile
// without changes. All color decisions are made in globals.css via CSS variables.

interface ThemeContextType {
  theme: "light";
  toggleTheme: () => void;
  setTheme: (t: "light") => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "light", toggleTheme: () => {}, setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
