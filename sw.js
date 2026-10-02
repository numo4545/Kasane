/* かさね撮り: オフラインでも起動できるように、アプリのファイルを端末に保存しておく係 */
const CACHE = 'kasane-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: !isFont }).then((hit) => {
        // 保存分があればすぐ返し、裏で新しい版を取りに行って次回に備える
        const fresh = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        });
        if (hit) {
          if (!isFont) event.waitUntil(fresh.catch(() => {}));
          return hit;
        }
        return fresh.catch(() =>
          req.mode === 'navigate' ? cache.match('index.html') : Response.error()
        );
      })
    )
  );
});
