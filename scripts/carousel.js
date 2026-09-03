'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('carousel-container');
  const carousel  = document.getElementById('carousel');
  if (!container || !carousel) return;

  const originalCards = Array.from(carousel.querySelectorAll('.book-card'));
  const originalCount = originalCards.length;
  if (!originalCount) return;

  let cards, clonesCount = 0;

  if (window.innerWidth > 768) {
    const clonesBefore = originalCards.slice().reverse().map(c => c.cloneNode(true));
    clonesBefore.forEach(clone => {
      clone.tabIndex = -1;
      clone.setAttribute('aria-hidden', 'true');
    });
    clonesBefore.forEach(clone => carousel.insertBefore(clone, carousel.firstChild));
    const clonesAfter = originalCards.map(c => c.cloneNode(true));
    clonesAfter.forEach(clone => {
      clone.tabIndex = -1;
      clone.setAttribute('aria-hidden', 'true');
    });
    clonesAfter.forEach(clone => carousel.appendChild(clone));
    cards = Array.from(carousel.querySelectorAll('.book-card'));
    clonesCount = clonesBefore.length;
  } else {
    cards = originalCards;
  }

  function cardStride() {
    const gap = parseFloat(getComputedStyle(carousel).columnGap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  }

  // =========================
  // ПОЗИЦИОНИРОВАНИЕ
  // =========================
  function positionFirstCard() {
    if (window.innerWidth > 768) {
      const first = cards[clonesCount];
      container.scrollLeft = first.offsetLeft;
    } else {
      container.style.scrollSnapType = 'none';
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = 0;
      setTimeout(() => {
        container.style.scrollSnapType = '';
        container.style.scrollBehavior = '';
      }, 150);
    }
  }

  // Запускаем после полной отрисовки страницы
  window.addEventListener('load', positionFirstCard);
  setTimeout(positionFirstCard, 200);

  // =========================
  // БЕСКОНЕЧНЫЙ СКРОЛЛ (ПК)
  // =========================
  if (window.innerWidth > 768) {
    container.addEventListener('scroll', () => {
      const stride = cardStride();
      const maxScroll = (originalCount + clonesCount) * stride;
      if (container.scrollLeft <= 0) {
        container.scrollLeft += originalCount * stride;
      } else if (container.scrollLeft >= maxScroll) {
        container.scrollLeft -= originalCount * stride;
      }
    });
  }

  // =========================
  // КЛИК ПО КАРТОЧКЕ
  // =========================
  // Один глобальный флаг вместо флага на каждой карточке —
  // это главное исправление, старый способ ломал клик навсегда
  let dragHappened = false;

  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (dragHappened || card.dataset.status === 'soon') return;
      const book = card.dataset.book;
      if (book) window.location.href = `book.html?book=${book}`;
    });
  });

  // =========================
  // ПК: drag + инерция
  // =========================
  if (window.innerWidth > 768) {
    let isDragging = false;
    let dragDistance = 0;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let scrollVelocity = 0;
    let rafId = null;

    container.addEventListener('mousedown', e => {
      isDragging = true;
      dragHappened = false; // сброс в начале каждого нажатия
      dragDistance = 0;
      lastPointerX = e.clientX;
      lastPointerTime = performance.now();
    });

    container.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    container.addEventListener('mouseup', () => {
      isDragging = false;
      // Небольшая задержка чтобы клик успел сработать раньше сброса
      setTimeout(() => { dragHappened = false; }, 50);
    });

    container.addEventListener('mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      const now = performance.now();
      const walk = e.clientX - lastPointerX;
      const elapsed = Math.max(now - lastPointerTime, 1);
      dragDistance += Math.abs(walk);
      if (dragDistance > 5) dragHappened = true;
      container.scrollLeft -= walk;
      scrollVelocity = (-walk / elapsed) * 16;
      lastPointerX = e.clientX;
      lastPointerTime = now;
    });

    container.addEventListener('wheel', e => {
      e.preventDefault();
      scrollVelocity += e.deltaY * 0.5;
      if (!rafId) rafId = requestAnimationFrame(smoothScroll);
    }, { passive: false });

    function smoothScroll() {
      container.scrollLeft += scrollVelocity;
      scrollVelocity *= 0.85;
      const stride = cardStride();
      const maxScroll = (originalCount + clonesCount) * stride;
      if (container.scrollLeft <= 0) container.scrollLeft += originalCount * stride;
      if (container.scrollLeft >= maxScroll) container.scrollLeft -= originalCount * stride;
      if (Math.abs(scrollVelocity) > 0.5) {
        rafId = requestAnimationFrame(smoothScroll);
      } else {
        rafId = null;
        scrollVelocity = 0;
      }
    }
  }
  // Анимация появления карточек при загрузке
  // Делаем через JS чтобы не конфликтовало с hover-эффектами
  const allOriginalCards = carousel.querySelectorAll('.book-card');
  allOriginalCards.forEach((card, i) => {
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
      // После появления убираем инлайн-стили чтобы hover работал нормально
      setTimeout(() => {
        card.style.transition = '';
        card.style.opacity = '';
        card.style.transform = '';
        card.classList.add('appeared');
      }, 450);
    }, 50 + i * 60);
  });
});
