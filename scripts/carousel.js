'use strict';

document.addEventListener('DOMContentLoaded', () => {

  const container = document.getElementById('carousel-container');
  const carousel  = document.getElementById('carousel');
  if (!container || !carousel) return;

  // =========================
  // 0. ОРИГИНАЛЬНЫЕ КАРТОЧКИ
  // =========================
  const originalCards = Array.from(carousel.querySelectorAll('.book-card'));
  const originalCount = originalCards.length;
  if (!originalCount) return;

  // =========================
  // 1. КЛОНИРОВАНИЕ ДЛЯ БЕСКОНЕЧНОГО СКРОЛЛА
  // =========================
  const clonesBefore = originalCards.slice().reverse().map(c => c.cloneNode(true));
  clonesBefore.forEach(clone => carousel.insertBefore(clone, carousel.firstChild));
  const clonesAfter = originalCards.map(c => c.cloneNode(true));
  clonesAfter.forEach(clone => carousel.appendChild(clone));

  const cards = Array.from(carousel.querySelectorAll('.book-card'));
  const clonesCount = clonesBefore.length;

  // =========================
  // 2. ШИРИНА КАРТОЧКИ + GAP
  // =========================
  const GAP = 20;
  const cardWidth = cards[0].offsetWidth + GAP;

  // =========================
  // 3. ПЕРВОНАЧАЛЬНАЯ ПОЗИЦИЯ
  // =========================
  const firstOriginalIndex = clonesCount;
  function positionFirstCard() {
    const first = cards[firstOriginalIndex];
    if (!first) return;

    if (window.innerWidth > 768) {
      container.scrollLeft = first.offsetLeft;
    } else {
      const center = container.offsetWidth / 2;
      const cardCenter = first.offsetLeft + first.offsetWidth / 2;
      container.scrollLeft = cardCenter - center;
    }
  }
  positionFirstCard();
  window.addEventListener('resize', positionFirstCard);

  // =========================
  // 4. БЕСКОНЕЧНЫЙ СКРОЛЛ (ПК + инерция)
  // =========================
  function normalizeScroll() {
    const maxScroll = (originalCount + clonesCount) * cardWidth;
    if (container.scrollLeft <= 0) container.scrollLeft += originalCount * cardWidth;
    if (container.scrollLeft >= maxScroll) container.scrollLeft -= originalCount * cardWidth;
  }
  container.addEventListener('scroll', normalizeScroll);

  // =========================
  // 5. КЛИК ПО КАРТОЧКЕ
  // =========================
  cards.forEach(card => {
    card.isDragging = false;
    card.addEventListener('click', () => {
      if (!card.isDragging) {
        const book = card.dataset.book;
        if (book) window.location.href = `book.html?book=${book}`;
      }
    });
  });

  // =========================
  // 6. DRAG + TOUCH + INERIA
  // =========================
  let isDragging = false;
  let lastX = 0;
  let velocity = 0;
  let rafId = null;

  function startDrag(x) {
    isDragging = true;
    lastX = x;
    velocity = 0;
    cancelAnimationFrame(rafId);
    rafId = null;
    cards.forEach(c => c.isDragging = false);
  }

  function moveDrag(x) {
    if (!isDragging) return;
    const dx = x - lastX;
    lastX = x;
    velocity = dx;
    container.scrollLeft -= dx;
    normalizeScroll();
    cards.forEach(c => c.isDragging = true);
  }

  function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    cards.forEach(c => c.isDragging = false);
    startInertia();
  }

  function startInertia() {
    const friction = 0.92;
    function step() {
      velocity *= friction;
      if (Math.abs(velocity) < 0.4) {
        velocity = 0;
        rafId = null;
        return;
      }
      container.scrollLeft -= velocity;
      normalizeScroll();
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ==== МЫШЬ ====
  container.addEventListener('mousedown', e => startDrag(e.pageX));
  container.addEventListener('mousemove', e => moveDrag(e.pageX));
  container.addEventListener('mouseup', stopDrag);
  container.addEventListener('mouseleave', stopDrag);

  // ==== TOUCH ====
  container.addEventListener('touchstart', e => {
    if (e.touches.length === 1) startDrag(e.touches[0].pageX);
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      e.preventDefault(); // блокируем нативный горизонтальный скролл
      moveDrag(e.touches[0].pageX);
    }
  }, { passive: false });

  container.addEventListener('touchend', stopDrag);
  container.addEventListener('touchcancel', stopDrag);

  // ==== КОЛЕСО ====
  container.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.5;
    if (!rafId) startInertia();
  }, { passive: false });

});