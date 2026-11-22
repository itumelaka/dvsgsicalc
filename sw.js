const cacheName = 'dvs-gsi-clay-v5-auth-gate';
const scope = self.registration.scope;
const shell = ['index.html', 'app.mjs', 'record.mjs', 'manifest.webmanifest', 'assets/icon.svg', 'assets/logo-dvs.webp'];
const shellUrls = shell.map(path => new URL(path, scope).href);
const indexUrl = shellUrls[0];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shellUrls.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('dvs-gsi-clay-') && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  if (request.mode === 'navigate' && [scope, indexUrl].includes(request.url.split('?')[0])) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(indexUrl, response.clone());
        return response;
      } catch {
        return cache.match(indexUrl);
      }
    })());
  } else if (shellUrls.includes(request.url)) {
    event.respondWith(caches.open(cacheName).then(async cache =>
      await cache.match(request) ?? fetch(request)));
  }
});
