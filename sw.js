// A versão vem de js/version.js. Quando ela muda, o navegador detecta o
// service worker novo e o cache antigo é apagado na ativação.
importScripts('./js/version.js', './js/brolaith.js');
const CACHE = 'sihaya-app-v' + self.SIHAYA_VERSION;
const FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/version.js',
  './js/programs.js',
  './js/brolaith.js',
  './js/companion.js',
  './js/app.js',
  './js/drive-sync.js',
  './manifest.webmanifest',
  './logo.svg',
  './img/brolaith.webp',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
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

// ---------- Notificações do Brolaith ----------
// O servidor manda um push vazio no horário; aqui escolhemos a fala certa a partir
// da configuração que o app salvou (horários, refeições e tratamento).
const pad2 = (n) => String(n).padStart(2, '0');
const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
async function reminderFor(now = new Date()) {
  let cfg = null;
  try {
    const hit = await (await caches.open('sihaya-config')).match('./sihaya-config.json');
    cfg = hit ? await hit.json() : null;
  } catch (e) {}
  const t = cfg?.treatment || 'pequena cavaleira';
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const item = (cfg?.schedule || [])
    .map((x) => ({ ...x, diff: Math.abs(minutesOf(x.time) - nowMin) }))
    .filter((x) => x.diff <= 10)
    .sort((a, b) => a.diff - b.diff)[0];
  if (!item) return { tag: 'teste', text: 'Teste recebido, ' + t + '. O vínculo funciona.' };
  if (item.kind === 'meal') {
    const meal = (cfg.meals || []).find((m) => m.id === item.meal);
    return {
      tag: 'meal' + item.time,
      text: self.brolaithSay('mealReminder', {
        t,
        refeicao: (meal?.name || 'refeição').toLowerCase(),
        hora: meal?.time || item.time,
      }),
    };
  }
  return { tag: 'water' + item.time, text: self.brolaithSay('waterReminder', { t }) };
}
self.addEventListener('push', (e) => {
  e.waitUntil(
    (async () => {
      const r = await reminderFor();
      await self.registration.showNotification('Brolaith', {
        body: r.text,
        tag: r.tag,
        icon: './icon-192.png',
        badge: './icon-192.png',
        data: { text: r.text },
      });
    })(),
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const text = e.notification.data?.text;
      for (const c of all) {
        c.postMessage({ type: 'reminder', text });
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow('./');
    })(),
  );
});
