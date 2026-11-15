// Folios FO · service worker: guarda la app en el teléfono para que abra al instante y sin señal.
// Al publicar una versión nueva, cambia el número de CACHE (igual que APP_VERSION en index.html).
const CACHE = 'folios-fo-v0.10.0';
const MAPAS = 'folios-fo-mapas';          // pedazos de mapa ya vistos, para verlos sin señal
const MAX_MAPAS = 3000;                    // ~30-50 MB como máximo
const ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MAPAS).map(k => caches.delete(k)))));
  self.clients.claim();
});

let nuevos = 0;
async function recortarMapas(){
  if (++nuevos % 50) return;
  const c = await caches.open(MAPAS), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_MAPAS; i++) await c.delete(ks[i]);
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'tile.openstreetmap.org') {          // mapas: lo guardado primero; si no, internet
    e.respondWith(caches.open(MAPAS).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) { c.put(e.request, res.clone()); recortarMapas(); }
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;               // el servidor (Apps Script) nunca se guarda
  // App: abre al instante con la copia guardada y actualiza en segundo plano para la próxima vez.
  // (Antes esperaba a internet primero: con señal débil la app tardaba en abrir.)
  e.respondWith(caches.open(CACHE).then(async c => {
    const guardada = await c.match(e.request, {ignoreSearch: true});
    const red = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => null);
    if (guardada) { e.waitUntil(red); return guardada; }
    // No estaba guardada: se pide a internet; sin señal, se abre la app guardada
    return (await red) || (e.request.mode === 'navigate' && await c.match('./index.html')) || new Response('Sin conexión', {status: 503});
  }));
});
