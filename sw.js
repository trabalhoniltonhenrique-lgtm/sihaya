// Troque o nome do cache ao publicar uma nova versão para limpar caches antigos.
const CACHE = 'sihaya-app-v2-4';
const FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/drive-sync.js',
  './manifest.webmanifest',
  './logo-sihaya.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('sihaya-app-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);

// Rede primeiro: com internet, sempre entrega a versão mais recente de
// todos os arquivos (página, scripts e imagens) e atualiza o cache.
// Sem internet, usa a cópia guardada.
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  const navigate = e.request.mode === 'navigate';
  e.respondWith(
    (async () => {
      try {
        const r = await fetch(e.request, { cache: 'no-cache' });
        if (r.ok) {
          const c = await caches.open(CACHE);
          await c.put(navigate ? './index.html' : e.request, r.clone());
        }
        return r;
      } catch {
        const hit = await caches.match(navigate ? './index.html' : e.request, {
          ignoreSearch: true,
        });
        return hit || Response.error();
      }
    })(),
  );
});
