/**
 * Habit Activity service worker.
 *
 * Strategy:
 * - Precache the offline fallback page + core icons (app shell reliability).
 * - Navigations: network-first, fall back to cached page, then /offline.
 *   (Pages render user-specific habit data from the DB — never serve stale HTML.)
 * - Static assets (/_next/static, /icons): cache-first — they are content-hashed
 *   or immutable, so caching them is always safe.
 * - Server actions (POST) and everything else: network only. This covers the
 *   habit mutations, the GitHub GraphQL sync, and any credential-bearing
 *   request — nothing sensitive or user-specific is ever cached.
 */

const VERSION = "v2";
const SHELL_CACHE = `habit-activity-shell-${VERSION}`;
const ASSET_CACHE = `habit-activity-assets-${VERSION}`;

const PRECACHE_URLS = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch non-GET traffic: server actions, API mutations, anything
  // carrying credentials or tokens goes straight to the network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only; cross-origin requests (none expected today) pass through.
  if (url.origin !== self.location.origin) return;

  // Cache-first for immutable static assets.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first for navigations (pages render live DB data), with an
  // offline fallback so the shell still opens without connectivity.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return (
            cached ||
            caches.match("/offline") ||
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        })
    );
  }

  // All other GETs (RSC payload fetches etc.): network with a last-resort
  // cache hit, but never write dynamic responses into the cache.
});
