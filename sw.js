// sw.js - Service Worker for NexMem PWA & Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

// Handle incoming Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'NexMem Reminder', body: 'You have a new reminder!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%237c3aed" width="100" height="100" rx="20"/><text x="50%" y="50%" font-size="50" text-anchor="middle" dy=".3em" fill="white">✨</text></svg>',
    badge: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="white"/></svg>',
    vibrate: [200, 100, 200],
    data: data.url || './app.html',
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow(event.notification.data || './app.html');
      }
    })
  );
});

// Listen for messages from the client app (app.js)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%237c3aed" width="100" height="100" rx="20"/><text x="50%" y="50%" font-size="50" text-anchor="middle" dy=".3em" fill="white">✨</text></svg>',
    });
  }
});
