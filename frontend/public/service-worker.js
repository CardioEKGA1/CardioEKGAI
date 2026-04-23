/*
 * SoulMD service worker.
 * Minimal Phase-1 strategy:
 *   - Cache-first for static shell (index.html, JS, CSS, icons) so the app
 *     opens offline on home-screen install.
 *   - Network-first for API calls so clinicians never see stale patient
 *     or billing data.
 *   - Clean up old caches on activate.
 *
 * iOS 16.4+ is required for installed-PWA push notifications; we register a
 * placeholder push handler here so future backend work can deliver messages
 * without shipping a new SW.
 */
const VERSION = 'soulmd-v5';
const STATIC_CACHE = `${VERSION}-static`;
const SHELL = [
  '/',
  '/concierge',
  '/manifest.json',
  '/manifest-concierge.json',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/og-image.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Don't intercept cross-origin (Stripe, Sentry, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first for any concierge/auth/tools/billing API calls.
  const isApi =
    url.pathname.startsWith('/concierge/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/tools/') ||
    url.pathname.startsWith('/billing/') ||
    url.pathname.startsWith('/config');
  if (isApi) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for HTML navigation requests (the shell). HTML points at
  // hashed JS/CSS bundles that change on every deploy — serving stale HTML
  // leads to 404s on dead bundle hashes and a white screen. When offline,
  // fall back to the last-known shell.
  const isHtmlNav =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
  if (isHtmlNav) {
    event.respondWith(
      fetch(request).then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, copy));
        }
        return resp;
      }).catch(() => caches.match(request).then(hit => hit || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first is ONLY safe for content-addressed (hashed) assets under
  // /static/ — their filename contains a content hash so changes always
  // produce a new URL. For any other asset (e.g. /card-back.png,
  // /manifest.json, root-level PNGs), a bad cached response at that stable
  // URL sticks forever; use network-first with cache as offline fallback.
  const isHashedStatic = url.pathname.startsWith('/static/');
  if (isHashedStatic) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(resp => {
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, copy));
        }
        return resp;
      }).catch(() => caches.match('/index.html')))
    );
    return;
  }

  // Everything else (images, fonts, manifest, etc.) — network-first so a
  // transient 404 or mis-deploy can't poison the cache at a stable URL.
  // Only cache successful 200 responses with basic origin.
  event.respondWith(
    fetch(request).then(resp => {
      if (resp && resp.ok && resp.type === 'basic') {
        const copy = resp.clone();
        caches.open(STATIC_CACHE).then(c => c.put(request, copy));
      }
      return resp;
    }).catch(() => caches.match(request))
  );
});

// Push notification hook — backend can POST to a user's subscription and the
// UI will render the notification even when the app is closed. Subscription
// persistence + VAPID signing will be wired in Phase 2.
self.addEventListener('push', (event) => {
  let data = { title: 'SoulMD Concierge', body: 'You have an update.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/logo192.png',
    badge: '/favicon.svg',
    tag: data.tag || 'soulmd-concierge',
    data: data.url || '/concierge',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/concierge';
  event.waitUntil(self.clients.openWindow(url));
});
