const { link } = require("node:fs");

const CACHE_NAME = 'if-hub';
const urlsToCache = [
  '/',
  'index.html',
  'dashboard.html',
  'callback.html',
  '/assets/css/style.css',
  '/assets/icons/IF HUB - SEM FUNDO - 192x192.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});