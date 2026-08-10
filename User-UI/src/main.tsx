import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initFirebase } from "@/lib/firebase";
import { getNativeFcmToken } from "@/lib/notificationTokens";
import { registerNativeTokenWithSession } from "@/store/authStore";
import { loadThemeFromCMS } from "@/lib/themeLoader";
import "./index.css";

// Load theme colors from CMS before mounting the app.
// This runs in the background; the app mounts immediately with CSS defaults
// and any CMS overrides are applied as soon as the response arrives.
loadThemeFromCMS().catch(() => undefined);

initFirebase().catch(() => undefined);

function linkNativeFcmToken(rawToken: unknown) {
  if (typeof rawToken !== "string" || !rawToken.trim()) return;

  window.kryrosNativeFcmToken = rawToken.trim();
  void registerNativeTokenWithSession(window.kryrosNativeFcmToken);
}

const initialNativeFcmToken = getNativeFcmToken();
if (initialNativeFcmToken) linkNativeFcmToken(initialNativeFcmToken);

window.addEventListener("kryros:native-fcm-token", (event: Event) => {
  linkNativeFcmToken((event as CustomEvent<string>).detail);
});

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

// Handle chunk loading errors (often caused by new deployments)
window.addEventListener("error", (event) => {
  if (
    event.message.includes("Loading chunk") ||
    event.message.includes("Loading CSS chunk") ||
    event.message.includes("Failed to fetch dynamically imported module")
  ) {
    console.warn("Chunk load error detected. Attempting to recover...");
    // Only reload if we haven't already reloaded recently to avoid loops
    const lastReload = sessionStorage.getItem("kryros_last_chunk_reload");
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem("kryros_last_chunk_reload", now.toString());
      window.location.reload();
    }
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
