/**
 * sw.js — Service Worker voor offline ondersteuning
 *
 * Strategie:
 *  - Lokale bestanden (HTML/JS/CSS/afbeeldingen): cache-first, achtergrond-update
 *  - Externe CDN + Supabase Storage public URLs: network-first met cache-fallback
 *  - Supabase REST/Auth API-aanroepen: altijd netwerk, nooit cachen
 */

const CACHE = 'checklist-v1';

// Lokale bestanden die direct bij installatie worden gecached
const PRECACHE = [
  'fill.html',
  'index.html',
  'login.html',
  'config.js',
  'auth.js',
  'branding.js',
  'sidebar.js',
  'offline-db.js',
  'favicon.png',
  'foldriq-logo.png',
  'manifest.json',
];

// ── Install: precache lokale bestanden ──────────────────────────────────────
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Precache fout:', err))
  );
});

// ── Activate: verwijder oude caches ────────────────────────────────────────
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: verzoeken afhandelen ────────────────────────────────────────────
self.addEventListener('fetch', evt => {
  const req = evt.request;
  if (req.method !== 'GET') return; // alleen GET cachen

  const url = new URL(req.url);

  // ── Supabase REST / Auth API: nooit cachen, altijd netwerk ──────────────
  // Alleen Storage public objects mogen gecached worden
  if (
    url.hostname.includes('supabase.co') &&
    !url.pathname.includes('/storage/v1/object/public/')
  ) {
    return; // laat browser zelf afhandelen (= netwerk of fout)
  }

  // ── Lokale bestanden: cache-first, achtergrond revalidate ────────────────
  if (url.origin === self.location.origin) {
    evt.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(cached => {
          // Haal op van netwerk op de achtergrond en update cache
          const networkFetch = fetch(req).then(res => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => null);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // ── Externe resources (CDN, fonts, Storage foto's): network-first ────────
  evt.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
