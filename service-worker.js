/* Offline cache: app shell only. Bump CACHE when you change any file. */
const CACHE = 'snake-play-nokia-v2.0.0';
const FILES = [
  './', './index.html', './manifest.webmanifest', './assets/icon.svg',
  './css/base.css', './css/ui.css', './css/game.css',
  './js/config.js', './js/storage.js', './js/audio.js', './js/engine.js', './js/renderer.js',
  './js/input.js', './js/achievements.js', './js/ui.js', './js/app.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
