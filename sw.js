/**
 * Service Worker for Birthday Wishing PWA
 * Uses NETWORK-FIRST strategy for HTML/JS files to ensure instant sync updates,
 * while still caching for offline support.
 * Firebase/Firestore requests are always passed through to the network.
 */

const CACHE_NAME = 'hbd-sync-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './css/admin.css',
  './js/audio.js',
  './js/main.js',
  './js/admin.js',
  './manifest.json',
  './icon.svg'
];

// Install: Pre-cache all static assets
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Immediately activate the new SW
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: Delete old caches and take control of all clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Take control of all open tabs immediately (no waiting for reload)
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first for pages & scripts, passthrough for Firebase
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always let Firebase/Firestore API requests pass through directly
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    return; // Don't intercept — let the browser handle it normally
  }

  // For same-origin requests (our HTML, JS, CSS files): NETWORK-FIRST
  // Try the network first for the freshest content, fall back to cache if offline
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          // Clone and update cache with the fresh response
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // Network failed — serve from cache (offline mode)
          return caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline — please reconnect to sync.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
    return;
  }

  // For external resources (CDNs, fonts): cache-first
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});
