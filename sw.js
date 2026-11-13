// Guarda la app en el teléfono para que abra sin señal.
// Al publicar una versión nueva, cambia el número de CACHE (igual que APP_VERSION en index.html).
const CACHE = 'folios-fo-v0.3.1';
const MAPAS = 'folios-fo-mapas';          // pedazos de mapa ya vistos, para verlos sin señal
const MAX_MAPAS = 3000;                    // ~30-50 MB como máximo
const ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MAPAS).map(k => caches.delete(k))))); self.clients.claim(); });
let nuevos = 0;
async function recortarMapas(){ if (++nuevos % 50) return; 
  const c = await caches.open(MAPAS), ks = await c.keys(); for(let i = 0; i < ks.length - MAX_MAPAS; i++) await c.delete(ks[i]); }
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'tile.openstreetmap.org') {          // mapas: primero lo guardado, si no, internet
    e.respondWith(caches.open(MAPAS).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); recortarMapas(); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;               // el servidor (Apps Script) nunca se guarda
  e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('./index.html'))));
});
