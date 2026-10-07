// Offline shell for Apartment Billing. Caches the app page, icons and Firebase/Google font scripts.
// Live data (Firestore, Auth) always goes to the network.
const V = 'apt-shell-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // never cache live Firebase traffic or the auth handler
  if (u.hostname.endsWith('googleapis.com') && u.hostname !== 'fonts.googleapis.com') return;
  if (u.hostname.endsWith('firebaseapp.com') || u.pathname.startsWith('/__/')) return;

  // page loads: network first, fall back to the saved copy when offline
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put(r, copy));
        return res;
      }).catch(() => caches.match(r).then(m => m || caches.match('./')))
    );
    return;
  }

  // everything else: serve the saved copy, refresh it in the background
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
