// Kreutztraeger Kaelteanlage - Service Worker v2.1.0
// GitHub Pages kompatibel

var CACHE = 'kt-v2.1.0';
var OFFLINE = 'offline.html';

// Nur lokale Dateien - KEINE CDN-URLs
var FILES = [
  'index.html',
  'offline.html',
  'manifest.json',
  'icons/icon-72x72.png',
  'icons/icon-96x96.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png'
];

// INSTALL
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      var promises = FILES.map(function(file) {
        return cache.add(file).catch(function(err) {
          console.warn('[SW] Cache-Fehler:', file, err);
        });
      });
      return Promise.all(promises);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ACTIVATE
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// FETCH
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  if (event.request.url.indexOf('chrome-extension') !== -1) return;
  // Externe URLs (CDN etc.) direkt durchlassen
  if (event.request.url.indexOf(self.location.origin) === -1) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        fetch(event.request).then(function(fresh) {
          if (fresh && fresh.ok) {
            caches.open(CACHE).then(function(c) {
              c.put(event.request, fresh.clone());
            });
          }
        }).catch(function() {});
        return cached;
      }
      return fetch(event.request).then(function(response) {
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) {
            c.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE);
        }
        return new Response('', { status: 408 });
      });
    })
  );
});

// MESSAGE
self.addEventListener('message', function(event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
