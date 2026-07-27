import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initFirebase } from "@/lib/firebase";
import { getNativeFcmToken } from "@/lib/notificationTokens";
import { registerNativeTokenWithSession } from "@/store/authStore";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
