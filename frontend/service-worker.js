const CACHE_NAME = 'if-smart-v6'; // Mude a versão quando atualizar os arquivos
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/callback.html',
  '/style.css',
  '/dashboard.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Instalação
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
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Erro no cache:', error);
      })
  );
});

// Ativação
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
      console.log('Service Worker: Ativado e pronto!');
      return self.clients.claim();
    })
  );
});

// Estratégia: Network First (tenta rede, depois cache)
self.addEventListener('fetch', event => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições de extensões do Chrome
  if (event.request.url.startsWith('chrome-extension')) return;
  
  // Para HTML - estratégia especial
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Atualiza o cache com a nova versão
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/dashboard.html');
          });
        })
    );
    return;
  }

  // Para outros recursos (CSS, JS, imagens) - Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then(response => {
            // Cache dos novos recursos
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback para recursos não encontrados
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return new Response('Imagem não disponível offline', { status: 404 });
            }
          });
      })
  );
});