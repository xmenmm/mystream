// MyStream Service Worker — minimal offline-first untuk shell + cache strategi network-first untuk dynamic.
// Bisa di-extend untuk push notification.

const CACHE_NAME = 'mystream-shell-v1';
const SHELL_URLS = [
  '/',
  '/dashboard',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Skip API + video file + auth - selalu network
  if (url.pathname.startsWith('/api/') ||
      url.pathname.includes('/file') ||
      url.pathname.includes('/thumb') ||
      url.pathname.startsWith('/_next/data')) {
    return;
  }
  // Network-first untuk page, fallback ke cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || new Response('Offline', { status: 503 }))),
  );
});

// Push notification (akan aktif setelah push subscription di-setup)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'MyStream', body: event.data.text() };
  }
  const title = payload.title || 'MyStream';
  const opts = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/dashboard' },
    tag: payload.tag || 'mystream',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
