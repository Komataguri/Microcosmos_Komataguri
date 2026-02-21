'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('carousel-container');
  const carousel  = document.getElementById('carousel');
  if (!container || !carousel) return;

  // -----------------------------
  // 1. оригинальные карточки
  // -----------------------------
  const originalCards = Array.from(carousel.querySelectorAll('.book-card'));
  const originalCount = originalCards.length;
  if (!originalCount) return;

  // -----------------------------
  // 2. клоны для бесконечного скролла (ПК)
  // -----------------------------
  const clonesBefore = originalCards.slice().reverse().map(c => c.cloneNode(true));
  clonesBefore.forEach(clone => carousel.insertBefore(clone, carousel.firstChild));
  const clonesAfter = originalCards.map(c => c.cloneNode(true));
  clonesAfter.forEach(clone => carousel.appendChild(clone));

  const cards = Array.from(carousel.querySelectorAll('.book-card'));
  const clonesCount = clonesBefore.length;

  const GAP = 20;
  const cardWidth = cards[0].offsetWidth + GAP;

  // -----------------------------
  // 3. начальная позиция
  // -----------------------------
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

  // -----------------------------
  // 4. бесконечный скролл (только ПК)
  // -----------------------------
  function normalizeScroll() {
    if (window.innerWidth <= 768) return; // мобильный — используем нативный скролл
   const maxScroll = (originalCount + clonesCount) * cardWidth;
   if (container.scrollLeft <= 0) container.scrollLeft += originalCount * cardWidth;
   if (container.scrollLeft >= maxScroll) container.scrollLeft -= originalCount * cardWidth;
  }
  container.addEventListener('scroll', normalizeScroll);

  // -----------------------------
  // 5. клик по карточке (не срабатывает при drag)
  // -----------------------------
  cards.forEach(card => {
    card.isDragging = false;
    card.addEventListener('click', () => {
      if (!card.isDragging) {
        const book = card.dataset.book;
        if (book) window.location.href = `book.html?book=${book}`;
      }
    });
  });

  // -----------------------------
  // 6. drag / touch + инерция
  // -----------------------------
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
    cards.forEach(c => (c.isDragging = false));
  }

  function moveDrag(dx) {
   if (!isDragging) return;
   velocity = dx;
   container.scrollLeft -= dx;
    normalizeScroll(); // теперь работает для всех устройств
   cards.forEach(c => (c.isDragging = true));
  }

  function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    cards.forEach(c => (c.isDragging = false));
    startInertia();
  }

  function startInertia() {
    const friction = 0.92;
    function step() {
      velocity *= friction;
      if (Math.abs(velocity) < 0.4) { velocity = 0; rafId = null; return; }
      container.scrollLeft -= velocity;
      if (window.innerWidth > 768) normalizeScroll();
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ==== MOUSE ====
  container.addEventListener('mousedown', e => startDrag(e.pageX));
  container.addEventListener('mousemove', e => moveDrag(e.pageX));
  window.addEventListener('mouseup', stopDrag);
  container.addEventListener('mouseleave', stopDrag);

  // ==== WHEEL ====
  container.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.5;
    if (!rafId) startInertia();
  }, { passive: false });

});