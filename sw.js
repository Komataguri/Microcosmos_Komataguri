const CACHE_NAME = 'chitalka-cache-v1';
const ASSETS_TO_CACHE = [
  '/', // если сайт хостится в корне
  '/index.html',
  '/book.html',
  '/styles.css', // если у тебя отдельный файл стилей — иначе можно удалить
  // можно добавить обложки и прочие статические ресурсы
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // кешируем основные ассеты
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        // noop: если чего-то нет — не ломаем установку
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
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Простейшая стратегия: сначала пробуем сеть, при неудаче — кэш
self.addEventListener('fetch', (event) => {
  const request = event.request;
  // кешируем GET-запросы
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request).then(networkResponse => {
      // опционально можно обновлять кэш для статических ресурсов
      // но чтобы не захламлять — кешируем только успешные ответы
      if (networkResponse && networkResponse.status === 200) {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          // не кешируем большие внешние API по умолчанию, но можно добавить условия
          cache.put(request, clone).catch(() => {});
        });
      }
      return networkResponse;
    }).catch(() => {
      // при ошибке сети берем из кэша
      return caches.match(request).then(cached => cached || caches.match('/'));
    })
  );
});
