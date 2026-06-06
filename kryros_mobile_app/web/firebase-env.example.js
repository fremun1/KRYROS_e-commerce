// firebase-env.example.js
// ── COPY THIS FILE to firebase-env.js (gitignored) and fill in your values ──
// firebase-env.js is loaded BEFORE firebase-config.js in index.html for local dev
// For production, inject these values via CI/CD environment variables

window.KRYROS_FIREBASE_CONFIG = {
  apiKey:            "YOUR_FIREBASE_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
  vapidKey:          "YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE",
};

// How to get these values:
//   1. Go to Firebase Console → Project Settings → General → Your apps
//   2. Copy the firebaseConfig object values here
//   3. For vapidKey: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
