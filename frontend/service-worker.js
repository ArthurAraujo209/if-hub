const CACHE_NAME = 'if-smart-v16';

const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/callback.html',
  '/style.css',
  '/dashboard.js',
  '/auth.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  console.log('Service Worker instalando');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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

            const responseClone = response.clone(); // ← Você esqueceu os () aqui btw!

            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));

          }

          return response;

        });
    })
);



// 🔔 PUSH NOTIFICATIONS
self.addEventListener('push', event => {
  console.log('📨 Push recebido:', event);

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'IF HUB',
      body: event.data?.text() || 'Nova atualização!'
    };
  }

  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png', // ícone menor para badge
    tag: data.tag || 'default',
    requireInteraction: true, // não some até clicar
    data: {
      url: data.url || '/dashboard.html'
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' }
    ],
    vibrate: [200, 100, 200] // padrão de vibração
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'IF HUB', options)
  );
});

// 👆 CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', event => {
  console.log('🔔 Clique na notificação:', event.action);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard.html';

  // Se clicou em "Dispensar", só fecha
  if (event.action === 'dismiss') {
    return;
  }

  // Abre/foca a janela do app
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then(clientList => {
      
      // Tenta focar janela existente
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não achou, abre nova
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

});
