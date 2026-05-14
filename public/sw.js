const CACHE_NAME = 'dayof-static-v4';
const ASSETS = ['/manifest.webmanifest', '/image.png', '/event-hub-offline.html'];
const STATIC_ASSET_PATTERN = /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/i;

function isSafeStaticRequest(requestUrl, request) {
  if (request.method !== 'GET') return false;
  if (request.headers.has('Authorization')) return false;
  if (requestUrl.origin !== self.location.origin) return false;
  if (request.mode === 'navigate') return false;
  if (request.destination === 'document') return false;
  if (requestUrl.pathname.startsWith('/functions/v1/')) return false;
  if (requestUrl.pathname.startsWith('/auth/v1/')) return false;
  if (requestUrl.pathname.startsWith('/rest/v1/')) return false;
  if (requestUrl.pathname.startsWith('/storage/v1/')) return false;
  if (requestUrl.search) return false;
  if (ASSETS.includes(requestUrl.pathname)) return true;
  return STATIC_ASSET_PATTERN.test(requestUrl.pathname);
}

function isCacheableStaticResponse(response) {
  if (!response || !response.ok) return false;
  const cacheControl = response.headers.get('Cache-Control') || '';
  if (/(?:^|,)\s*(?:private|no-store|no-cache)\b/i.test(cacheControl)) return false;

  const contentType = response.headers.get('Content-Type') || '';
  if (/text\/html|application\/json/i.test(contentType)) return false;
  return true;
}

function isGuestHubNavigationRequest(requestUrl, request) {
  if (request.method !== 'GET') return false;
  if (request.headers.has('Authorization')) return false;
  if (requestUrl.origin !== self.location.origin) return false;
  if (request.mode !== 'navigate') return false;
  if (request.destination && request.destination !== 'document') return false;
  return /^\/event\/[^/]+(?:\/.*)?$/.test(requestUrl.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (isGuestHubNavigationRequest(requestUrl, event.request)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/event-hub-offline.html'))
    );
    return;
  }

  if (!isSafeStaticRequest(requestUrl, event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => (
      cached || fetch(event.request).then((response) => {
        if (!isCacheableStaticResponse(response)) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
    )).catch(() => caches.match(event.request))
  );
});
