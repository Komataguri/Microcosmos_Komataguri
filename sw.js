const CACHE_NAME = 'chitalka-cache-v1';
const ASSETS_TO_CACHE = [
  './',               // текущая папка репозитория
  'index.html',
  'book.html',
  'styles.css',
  // обложки книг
  'images/book-cover_1.jpg',
  'images/book-cover_2.jpg',
  'images/book-cover_3.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // кешируем основные ассеты
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        // если чего-то нет — не ломаем установку
        console.warn('Ошибка кеширования при install', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // очистка старых кэшей
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Простейшая стратегия: сначала пробуем сеть, при неудаче — кэш
self.addEventListener('fetch', (event) => {
  const request = event.request;
  // кешируем только GET-запросы
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request).then(networkResponse => {
      // обновляем кэш только успешные ответы
      if (networkResponse && networkResponse.status === 200) {
// --- кешируем динамические изображения глав отдельно ---
const url = new URL(request.url);
if (url.pathname.includes('/chapters/') && url.pathname.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
  caches.open(CACHE_NAME).then(cache => {
    cache.put(request, networkResponse.clone()).catch(() => {});
  });
}
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clone).catch(() => {});
        });
      }
      return networkResponse;
    }).catch(() => {
      // если сеть недоступна, берем из кэша
      return caches.match(request).then(cached => cached || caches.match('./'));
    })
  );
});