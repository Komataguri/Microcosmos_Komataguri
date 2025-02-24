self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('microcosmos-v1').then((cache) => 
      cache.addAll([
        '/',
        '/book.html',
        '/styles.css',
        '/js/main.js'
      ])
    )
  );
});