import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const rawPort = process.env.PORT ?? "5000";
const port = Number(rawPort);

// During build, PORT may not be set — fall back gracefully instead of throwing
const resolvedPort = Number.isNaN(port) || port <= 0 ? 5000 : port;

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["wouter"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
          "vendor-motion": ["framer-motion"],
          "vendor-charts": ["recharts"],
          "vendor-icons": ["lucide-react"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers"],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: resolvedPort,
    strictPort: true,
    host: "0.0.0.0",
    fs: { strict: true },
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "https://api.kryros.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: resolvedPort,
    host: "0.0.0.0",
  },
});
