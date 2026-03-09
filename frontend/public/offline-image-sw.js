const IMAGE_CACHE_NAME = "dating-app-images-v1";
const MAX_CACHED_IMAGES = 300;

const isUploadImageRequest = (request) => {
  if (!request || request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  // Only cache uploaded assets to keep cache focused and predictable.
  return url.pathname.startsWith("/uploads/");
};

const trimImageCache = async () => {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const keys = await cache.keys();

  if (keys.length <= MAX_CACHED_IMAGES) return;

  const overflow = keys.length - MAX_CACHED_IMAGES;
  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
};

const cacheFirstImage = async (request) => {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      void trimImageCache();
    }
    return networkResponse;
  } catch (_error) {
    if (cached) return cached;

    return new Response("", {
      status: 504,
      statusText: "Offline and image not cached"
    });
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("dating-app-images-") && name !== IMAGE_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (!isUploadImageRequest(event.request)) return;
  event.respondWith(cacheFirstImage(event.request));
});
