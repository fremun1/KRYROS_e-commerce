import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

async function loadFirebaseConfig(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/firebase-config.json', { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch {}
  return {};
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export async function initFirebase() {
  if (getApps().length) {
    app = getApps()[0];
    messaging = getMessaging(app);
    return { app, messaging };
  }

  const config = await loadFirebaseConfig();
  if (config.apiKey && config.projectId) {
    try {
      app = initializeApp(config);
      messaging = getMessaging(app);
    } catch (e) {
      console.warn('Firebase initialization failed:', e);
    }
  }
  return { app, messaging };
}

export async function requestNotificationPermission(messagingInstance: Messaging | null): Promise<string | null> {
  if (!messagingInstance || !('Notification' in window)) return null;
  if (Notification.permission === 'denied') return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messagingInstance, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    return token;
  } catch {
    return null;
  }
}

export function onForegroundMessage(messagingInstance: Messaging | null, callback: (payload: any) => void) {
  if (!messagingInstance) return;
  return onMessage(messagingInstance, callback);
}
