const CACHE_NAME = 'mactamagotchi-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './renderer.js',
  './manifest.json',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
       return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // return cached version or fetch from network
      return response || fetch(event.request).then((fetchRes) => {
         // Stash dynamic fetches in cache too, or just return fetchRes
         return caches.open(CACHE_NAME).then((cache) => {
           // We only cache GET requests
           if(event.request.method === 'GET') {
               cache.put(event.request, fetchRes.clone());
           }
           return fetchRes;
         });
      });
    })
  );
});
