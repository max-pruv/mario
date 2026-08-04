// IAM Kart — service worker.
// Precaches every asset so the game runs fully offline once opened online.
// Update strategy: stale-while-revalidate — every request is served from
// cache instantly (offline-proof) while the network refreshes the cache in
// the background. Combined with the update checks in index.html, installed
// clients pick up new releases automatically within minutes.
// Bump CACHE_VERSION on every release to force an immediate coordinated update.

const CACHE_VERSION = 'iam-kart-v4';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './vendor/three.module.js',
  './vendor/three.core.min.js',
  './vendor/addons/postprocessing/EffectComposer.js',
  './vendor/addons/postprocessing/RenderPass.js',
  './vendor/addons/postprocessing/ShaderPass.js',
  './vendor/addons/postprocessing/MaskPass.js',
  './vendor/addons/postprocessing/Pass.js',
  './vendor/addons/postprocessing/UnrealBloomPass.js',
  './vendor/addons/postprocessing/OutputPass.js',
  './vendor/addons/shaders/CopyShader.js',
  './vendor/addons/shaders/LuminosityHighPassShader.js',
  './vendor/addons/shaders/OutputShader.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly (works offline),
// refresh the cache in the background whenever the network is available.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      if (cached) return cached;
      const response = await network;
      // offline navigation to an uncached URL falls back to the app shell
      if (!response && request.mode === 'navigate') {
        return cache.match('./index.html');
      }
      return response;
    })
  );
});
