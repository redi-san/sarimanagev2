self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

const CACHE_NAME = "sarimanage-v1";
const URLS_TO_CACHE = ["/", "/login"];

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(event.request);

        // ✅ Only cache "basic" same-origin, full (200) responses
        const isSameOrigin = new URL(event.request.url).origin === self.location.origin;
        const isOk = response && response.status === 200;
        const isBasic = response.type === "basic"; // not opaque/cors

        if (isSameOrigin && isOk && isBasic) {
          await cache.put(event.request, response.clone());
        }

        return response;
      } catch (err) {
        // Offline fallback: return cached version if available
        const cached = await cache.match(event.request);
        return cached || new Response("Offline", { status: 503 });
      }
    })()
  );
});