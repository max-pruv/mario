// IAM Kart — service worker.
// Precaches every asset so the game runs fully offline once opened online.
// Update strategy: stale-while-revalidate — every request is served from
// cache instantly (offline-proof) while the network refreshes the cache in
// the background. Combined with the update checks in index.html, installed
// clients pick up new releases automatically within minutes.
// Bump CACHE_VERSION on every release to force an immediate coordinated update.

const CACHE_VERSION = 'iam-kart-v36';

// Pages served by these very old caches predate the in-page auto-reload
// logic — the only way to unstick them is a forced navigation on activate.
const LEGACY_CACHES = /^(kart-dash-v1|iam-kart-v2)$/;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './vendor/three.module.js',
  './vendor/peerjs.min.js',
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
  './vendor/addons/utils/BufferGeometryUtils.js',
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const stale = keys.filter((k) => k !== CACHE_VERSION);
    const hadLegacy = stale.some((k) => LEGACY_CACHES.test(k));
    await Promise.all(stale.map((k) => caches.delete(k)));
    await self.clients.claim();
    if (hadLegacy) {
      // Old pages can't reload themselves — do it for them.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        try { if (c.navigate) c.navigate(c.url); } catch (e) { /* best effort */ }
      }
    }
  })());
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
      if (!response && request.mode === 'navigate') {
        return cache.match('./index.html');
      }
      return response;
    })
  );
});
