importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

let firebaseConfig = {};
try {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/firebase-config.json', false);
  xhr.send(null);
  if (xhr.status === 200) firebaseConfig = JSON.parse(xhr.responseText);
} catch (e) {
  console.warn('Could not load firebase-config.json:', e);
}

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload: any) => {
    const notificationTitle = payload.notification?.title || 'KRYROS';
    const notificationOptions: NotificationOptions = {
      body: payload.notification?.body || '',
      icon: '/kryros-logo.png',
      badge: '/favicon.svg',
      data: payload.data || {},
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  self.addEventListener('notificationclick', (event: any) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
  });
}
