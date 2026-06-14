import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT ?? "5000";
const port = Number(rawPort);

// During build, PORT may not be set — fall back gracefully instead of throwing
const resolvedPort = Number.isNaN(port) || port <= 0 ? 5000 : port;

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    // ── Chunk splitting — browser caches vendor chunks independently ──────
    // On re-deploy, only changed app chunks need to be re-downloaded.
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime — almost never changes
          "vendor-react": ["react", "react-dom"],
          // Routing
          "vendor-router": ["wouter"],
          // Data fetching — large but stable
          "vendor-query": ["@tanstack/react-query"],
          // All Radix UI components bundled together
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
          // Animation — heavy, lazy split
          "vendor-motion": ["framer-motion"],
          // Charts — only loaded on chart pages
          "vendor-charts": ["recharts"],
          // Icons
          "vendor-icons": ["lucide-react"],
          // Forms
          "vendor-forms": ["react-hook-form", "@hookform/resolvers"],
        },
      },
    },
    // Warn if any chunk exceeds 500 KB
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: resolvedPort,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "https://kryrosbackend-rwb2.onrender.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: resolvedPort,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
