// Firebase configuration for web PWA
// ── IMPORTANT ─────────────────────────────────────────────────────────────────
// Firebase credentials are NOT stored here. They are injected at build/deploy
// time via window.KRYROS_FIREBASE_CONFIG (set in index.html from CI/CD env vars).
//
// To configure locally:
//   1. Copy firebase-env.example.js → firebase-env.js (gitignored)
//   2. Fill in your project values from Firebase Console
//   3. Add <script src="firebase-env.js"></script> to index.html for local dev
//
// For production (Render/CI): set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN etc.
//   as environment variables and use sed/envsubst to replace placeholders in index.html
// ──────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Config is injected at runtime via window.KRYROS_FIREBASE_CONFIG
// This prevents secrets from being hardcoded in source control.
const firebaseConfig = (typeof window !== 'undefined' && window.KRYROS_FIREBASE_CONFIG)
  ? window.KRYROS_FIREBASE_CONFIG
  : (() => {
      console.error('[Firebase] window.KRYROS_FIREBASE_CONFIG is not set. Push notifications will not work.');
      return {};
    })();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

// Request permission and get FCM device token
export const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const vapidKey = (typeof window !== 'undefined' && window.KRYROS_FIREBASE_CONFIG?.vapidKey)
        || process.env.FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        console.error('[Firebase] VAPID key not configured. Set vapidKey in KRYROS_FIREBASE_CONFIG.');
        return null;
      }

      const token = await getToken(messaging, { vapidKey });
      return token;
    }
  } catch (error) {
    console.error('Error getting permission or token:', error);
  }
  return null;
};

// Handle incoming messages when app is in foreground
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export { messaging };
