const CACHE_NAME = 'if-smart-v7'; //// ===== ALTERADO (nova versão) =====

const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/callback.html',
  '/style.css',
  '/dashboard.js',
  '/auth.js', //// ===== ADICIONADO =====
  '/manifest.json',

  //// ===== ADICIONADO (ícones PWA) =====
  '/icons/icon-192.png',
  '/icons/icon-512.png',

  //// ===== FONTES EXTERNAS =====
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];


// ================================
// INSTALAÇÃO
// ================================

self.addEventListener('install', event => {

  console.log('Service Worker: Instalando...');

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => {

        console.log('Service Worker: Cache aberto, adicionando arquivos...');

        return cache.addAll(urlsToCache);

      })
      .then(() => {

        console.log('Service Worker: Arquivos cacheados com sucesso!');

        //// ===== ADICIONADO =====
        return self.skipWaiting();
        //// ======================

      })
      .catch(error => {

        console.error('Service Worker: Erro no cache:', error);

      })

  );

});


// ================================
// ATIVAÇÃO
// ================================

self.addEventListener('activate', event => {

  console.log('Service Worker: Ativando...');

  event.waitUntil(

    caches.keys().then(cacheNames => {

      return Promise.all(

        cacheNames.map(cacheName => {

          if (cacheName !== CACHE_NAME) {

            console.log('Service Worker: Removendo cache antigo:', cacheName);

            return caches.delete(cacheName);

          }

        })

      );

    }).then(() => {

      //// ===== ADICIONADO =====
      return self.clients.claim();
      //// ======================

    })

  );

});


// ================================
// FETCH
// ================================

self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  if (event.request.url.startsWith('chrome-extension')) return;


  //// ================================
  //// HTML - NETWORK FIRST
  //// ================================

  if (event.request.mode === 'navigate') {

    event.respondWith(

      fetch(event.request)

        .then(response => {

          const responseClone = response.clone();

          caches.open(CACHE_NAME)

            .then(cache => {

              cache.put(event.request, responseClone);

            });

          return response;

        })

        .catch(() => {

          return caches.match(event.request)

            .then(cachedResponse => {

              if (cachedResponse) {

                return cachedResponse;

              }

              return caches.match('/dashboard.html');

            });

        })

    );

    return;

  }


  //// ================================
  //// ASSETS - CACHE FIRST
  //// ================================

  event.respondWith(

    caches.match(event.request)

      .then(cachedResponse => {

        if (cachedResponse) {

          return cachedResponse;

        }

        return fetch(event.request)

          .then(response => {

            if (response && response.status === 200) {

              const responseClone = response.clone();

              caches.open(CACHE_NAME)

                .then(cache => {

                  cache.put(event.request, responseClone);

                });

            }

            return response;

          })

          .catch(() => {

            //// ===== FALLBACK PARA IMAGENS =====
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {

              return new Response('Imagem não disponível offline', { status: 404 });

            }

          });

      })

  );

});