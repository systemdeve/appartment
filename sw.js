// Apartment Billing service worker.
// - Your own files (page, manifest, icons): always the newest version from the network, saved copy only when offline.
// - Firebase / Google font scripts: saved copy served instantly, refreshed in the background.
// - Live data (Firestore, Auth): always goes to the network.
// Changing the V name below is optional; the page already checks for new uploads by itself.
const V = 'apt-shell-v2';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'reload' }).then(res => res.ok && c.put(u, res)).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter(k => k !== V);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    // An older service worker was serving the old page: reload open windows once so they get the new code
    if (old.length) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach(c => { try { c.navigate(c.url); } catch (_) {} });
    }
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // never cache live Firebase traffic or the auth handler
  if (u.hostname.endsWith('googleapis.com') && u.hostname !== 'fonts.googleapis.com') return;
  if (u.hostname.endsWith('firebaseapp.com') || u.pathname.startsWith('/__/')) return;

  // your own files: network first (skipping the browser's HTTP cache), saved copy when offline
  if (u.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(r, { cache: 'no-store' });
        if (res && res.ok) { const c = await caches.open(V); c.put(r, res.clone()); }
        return res;
      } catch (err) {
        const hit = await caches.match(r, { ignoreSearch: true });
        if (hit) return hit;
        if (r.mode === 'navigate') { const page = await caches.match('./'); if (page) return page; }
        throw err;
      }
    })());
    return;
  }

  // other sites (Firebase SDK scripts, fonts): serve the saved copy, refresh it in the background
  e.respondWith(
    caches.match(r).then(m => {
      const net = fetch(r).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(V).then(c => c.put(r, copy));
        }
        return res;
      }).catch(() => m);
      return m || net;
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) return wins[0].focus();
    return self.clients.openWindow('./');
  })());
});
