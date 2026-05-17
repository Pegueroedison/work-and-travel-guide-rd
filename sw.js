/* === WORK AND TRAVEL GUIDE RD — SERVICE WORKER === */

const CACHE_NAME = 'wt-guide-rd-v42';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './cursos.html',
  './foro.html',
  './post.html',
  './login.html',
  './registro.html',
  './recuperar.html',
  './perfil.html',
  './admin.html',
  './preguntas.html',
  './record.html',
  './visa.html',
  './internet.html',
  './css/style.css',
  './css/cursos.css',
  './css/foro.css',
  './css/auth.css',
  './css/admin.css',
  './js/config.js',
  './js/ui.js',
  './js/main.js',
  './js/cursos.js',
  './js/foro.js',
  './js/auth.js',
  './js/admin.js',
  './js/admin-content-direct.js',
  './manifest.json',
  './images/logo.png',
  './images/ceac_status.png',
  './images/mescyt_1.png',
  './images/mescyt_2.png',
  './images/mescyt_3.png',
  './images/mescyt_4.png',
  './images/usmobile_1.png',
  './images/usmobile_2.png',
  './images/usmobile_3.png',
  './images/usmobile_4.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Nunito:wght@300;400;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn('Failed to cache:', url, err)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isLocal) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })).catch(() => caches.match('./index.html'))
    );
  } else {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
