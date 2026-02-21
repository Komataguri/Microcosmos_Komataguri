'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('carousel-container');
  const carousel  = document.getElementById('carousel');
  if (!container || !carousel) return;

  // =========================
  // 1. ОРИГИНАЛЬНЫЕ КАРТОЧКИ
  // =========================
  const originalCards = Array.from(carousel.querySelectorAll('.book-card'));
  const originalCount = originalCards.length;
  if (!originalCount) return;

  // =========================
  // 2. КЛОНЫ ДЛЯ БЕСКОНЕЧНОГО СКРОЛЛА (только ПК)
  // =========================
  let cards, clonesCount = 0;

  if (window.innerWidth > 768) { // ПК
    const clonesBefore = originalCards.slice().reverse().map(c => c.cloneNode(true));
    clonesBefore.forEach(clone => carousel.insertBefore(clone, carousel.firstChild));

    const clonesAfter = originalCards.map(c => c.cloneNode(true));
    clonesAfter.forEach(clone => carousel.appendChild(clone));

    cards = Array.from(carousel.querySelectorAll('.book-card'));
    clonesCount = clonesBefore.length;
  } else { // Мобильные — без клонов
    cards = originalCards;
  }

  const GAP = 20;
  const cardWidth = cards[0].offsetWidth + GAP;

  // =========================
  // 3. УСТАНОВКА ПЕРВОЙ КАРТОЧКИ
  // =========================
  function positionFirstCard() {
    if (window.innerWidth > 768) { // ПК
      const first = cards[clonesCount]; // первая оригинальная карточка
      container.scrollLeft = first.offsetLeft;
    } else { // Мобильные
      // временно отключаем центрирование через CSS
      cards.forEach(card => card.style.margin = '0');
      container.scrollLeft = 0; // ставим первую карточку в начало

      // через небольшой timeout возвращаем margin обратно
      setTimeout(() => {
        cards.forEach(card => card.style.margin = '');
      }, 50);
    }
  }

  positionFirstCard();
  window.addEventListener('resize', positionFirstCard);

  // =========================
  // 4. БЕСКОНЕЧНЫЙ СКРОЛЛ (только ПК)
  // =========================
  if (window.innerWidth > 768) {
    container.addEventListener('scroll', () => {
      const maxScroll = (originalCount + clonesCount) * cardWidth;
      if (container.scrollLeft <= 0) {
        container.scrollLeft += originalCount * cardWidth;
      } else if (container.scrollLeft >= maxScroll) {
        container.scrollLeft -= originalCount * cardWidth;
      }
    });
  }

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
  // 6. ПК: drag + инерция мышью
  // =========================
  if (window.innerWidth > 768) {
    let isDragging = false;
    let dragStartX = 0;
    let scrollStart = 0;
    let scrollVelocity = 0;
    let rafId = null;

    container.addEventListener('mousedown', e => {
      isDragging = true;
      dragStartX = e.pageX - container.offsetLeft;
      scrollStart = container.scrollLeft;
      cards.forEach(c => c.isDragging = false);
    });

    container.addEventListener('mouseleave', () => isDragging = false);
    container.addEventListener('mouseup', () => isDragging = false);

    container.addEventListener('mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = x - dragStartX;
      container.scrollLeft = scrollStart - walk;
      cards.forEach(c => c.isDragging = true);
      scrollVelocity = -walk; // для инерции колесиком
    });

    container.addEventListener('wheel', e => {
      e.preventDefault();
      scrollVelocity += e.deltaY * 0.5;
      if (!rafId) rafId = requestAnimationFrame(smoothScroll);
    }, { passive: false });

    function smoothScroll() {
      container.scrollLeft += scrollVelocity;
      scrollVelocity *= 0.85;

      const maxScroll = (originalCount + clonesCount) * cardWidth;
      if (container.scrollLeft <= 0) container.scrollLeft += originalCount * cardWidth;
      if (container.scrollLeft >= maxScroll) container.scrollLeft -= originalCount * cardWidth;

      if (Math.abs(scrollVelocity) > 0.5) {
        rafId = requestAnimationFrame(smoothScroll);
      } else {
        rafId = null;
        scrollVelocity = 0;
      }
    }
  }

  // =========================
  // 7. MOBILE: нативный свайп + scroll-snap
  // =========================
  // все через CSS, JS вмешиваться не нужно
});