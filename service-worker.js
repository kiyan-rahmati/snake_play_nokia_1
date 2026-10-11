/* =========================================================
   Snake Play Nokia — Service Worker
   Offline caching, application shell, and update management
   ========================================================= */

"use strict";

const CACHE_PREFIX = "snake-play-nokia";
const CACHE_VERSION = "v1.0.0";

const APP_CACHE = `${CACHE_PREFIX}-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest"
];

const OFFLINE_FALLBACK = "./offline.html";

/* ---------------------------------------------------------
   Install: cache the essential application shell
   --------------------------------------------------------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error(
          "[Snake PWA] Installation cache failed:",
          error
        );

        throw error;
      })
  );
});

/* ---------------------------------------------------------
   Activate: remove obsolete application caches
   --------------------------------------------------------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const obsoleteCaches = cacheNames.filter((cacheName) => {
          const belongsToApp = cacheName.startsWith(CACHE_PREFIX);

          const isCurrentCache =
            cacheName === APP_CACHE ||
            cacheName === RUNTIME_CACHE;

          return belongsToApp && !isCurrentCache;
        });

        return Promise.all(
          obsoleteCaches.map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* ---------------------------------------------------------
   Fetch: serve cached resources and support offline mode
   --------------------------------------------------------- */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  /* Never intercept requests to other origins. */
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  /* Navigation requests: network first, then cached fallback. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            const responseCopy = response.clone();

            caches.open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, responseCopy))
              .catch(() => {});

          }

          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          const cachedIndex = await caches.match("./index.html");

          if (cachedIndex) {
            return cachedIndex;
          }

          const offlinePage = await caches.match(OFFLINE_FALLBACK);

          if (offlinePage) {
            return offlinePage;
          }

          return new Response(
            "You are offline. Please reconnect and try again.",
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        })
    );

    return;
  }

  /* Static assets: cache first, then network. */
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (!isCacheableResponse(response)) {
            return response;
          }

          const responseCopy = response.clone();

          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseCopy))
            .catch(() => {});

          return response;
        });
      })
      .catch(() => {
        return new Response("", {
          status: 503,
          statusText: "Resource unavailable"
        });
      })
  );
});

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */

function isCacheableResponse(response) {
  return Boolean(
    response &&
    response.ok &&
    (response.type === "basic" || response.type === "default")
  );
}

/* ---------------------------------------------------------
   Messages: allow the application to request an update
   --------------------------------------------------------- */

self.addEventListener("message", (event) => {
  const message = event.data;

  if (!message || typeof message.type !== "string") {
    return;
  }

  if (message.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (message.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(
      caches.delete(RUNTIME_CACHE).then(() => {
        if (event.source && "postMessage" in event.source) {
          event.source.postMessage({
            type: "RUNTIME_CACHE_CLEARED"
          });
        }
      })
    );
  }
});