const CACHE_NAME = 'simplifrn-v13';

const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/callback.html',
  '/style.css',
  '/dashboard.js',
  '/auth.js',
  '/manifest.json',
  '/assets/icons/SIMPLIF - Icon 192x192.png',
  '/assets/icons/SIMPLIF - Icon 512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  console.log('Service Worker instalando');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
            console.log('Cacheado:', url);
          } catch (err) {
            console.error('Falhou:', url, err);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker ativando');

  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  if (event.request.url.startsWith('chrome-extension')) return;

  // API -> NETWORK FIRST
  if (event.request.url.includes('/api/')) {

    event.respondWith(
      fetch(event.request)
        .then(response => {

          const responseClone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));

          return response;

        })
        .catch(() => caches.match(event.request))
    );

    return;
  }

  // HTML -> NETWORK FIRST
  if (event.request.mode === 'navigate') {

    event.respondWith(
      fetch(event.request)
        .then(response => {

          const responseClone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));

          return response;

        })
        .catch(() => caches.match(event.request))
    );

    return;
  }

  // Assets -> CACHE FIRST
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {

        if (cachedResponse) return cachedResponse;

        return fetch(event.request)
          .then(response => {

            if (response && response.status === 200) {

              const responseClone = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));

            }

            return response;

          });
      })
  );

}); // ← fecha o addEventListener('fetch') corretamente

// 🔔 PUSH NOTIFICATIONS
self.addEventListener('push', event => {
  console.log('📨 Push recebido:', event);

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Simplif',
      body: event.data?.text() || 'Nova atualização!'
    };
  }

  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/assets/icons/SIMPLIF - Icon 192x192.png',
    badge: '/assets/icons/SIMPLIF - Icon 192x192.png',
    tag: data.tag || 'default',
    requireInteraction: true,
    data: {
      url: data.url || '/dashboard.html'
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' }
    ],
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Simplif', options)
  );
});

// 👆 CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', event => {
  console.log('🔔 Clique na notificação:', event.action);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard.html';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {

      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 🔔 FECHAR NOTIFICAÇÃO (sem clicar)
self.addEventListener('notificationclose', event => {
  console.log('🔕 Notificação fechada sem interação');
});
