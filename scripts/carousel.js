// scripts/carousel.js
const container = document.getElementById('carousel-container');
const carousel = document.getElementById('carousel');

// оригинальные карточки
let originalCards = Array.from(document.querySelectorAll('.book-card'));

// =========================
// 1. КЛОНИРОВАНИЕ КАРТОЧЕК ДЛЯ БЕСКОНЕЧНОГО СКРОЛЛА
// =========================
const clonesBefore = originalCards.slice().reverse().map(c => c.cloneNode(true));
clonesBefore.forEach(clone => carousel.insertBefore(clone, carousel.firstChild));

const clonesAfter = originalCards.map(c => c.cloneNode(true));
clonesAfter.forEach(clone => carousel.appendChild(clone));

let cards = Array.from(document.querySelectorAll('.book-card'));
const originalCount = originalCards.length;
const clonesCount = clonesBefore.length;

// =========================
// 2. РАСЧЁТ ШИРИНЫ КАРТОЧКИ С GAP
// =========================
const gap = 20;
const cardWidth = cards[0].offsetWidth + gap;

// =========================
// 3. ПЕРВОНАЧАЛЬНАЯ ПОЗИЦИЯ
// =========================
const firstOriginalIndex = clonesBefore.length;
function positionFirstCard() {
  const firstCard = cards[firstOriginalIndex];
  if (!firstCard) return;
  if (window.innerWidth > 768) {
    container.scrollLeft = firstCard.offsetLeft;
  } else {
    const containerCenter = container.offsetWidth / 2;
    const cardCenter = firstCard.offsetLeft + firstCard.offsetWidth / 2;
    container.scrollLeft = cardCenter - containerCenter;
  }
}
positionFirstCard();
window.addEventListener('resize', positionFirstCard);

// =========================
// 4. БЕСКОНЕЧНЫЙ СКРОЛЛ
// =========================
container.addEventListener('scroll', () => {
  const maxScroll = (originalCount + clonesCount) * cardWidth;
  if (container.scrollLeft <= 0) container.scrollLeft += originalCount * cardWidth;
  if (container.scrollLeft >= maxScroll) container.scrollLeft -= originalCount * cardWidth;
});

// =========================
// 5. DRAG СКРОЛЛ + TOUCH
// =========================
let isDragging = false;
let dragStartX = 0;
let scrollStart = 0;

function startDrag(x) {
    isDragging = true;
    dragStartX = x - container.getBoundingClientRect().left;
    scrollStart = container.scrollLeft;
    cards.forEach(c => c.isDragging = false);
}

function moveDrag(x) {
    if (!isDragging) return;
    const walk = x - container.getBoundingClientRect().left - dragStartX;
    container.scrollLeft = scrollStart - walk;
    cards.forEach(c => c.isDragging = true);
}

function stopDrag() {
    isDragging = false;
    cards.forEach(c => c.isDragging = false);
}

// ==== МЫШЬ ====
container.addEventListener('mousedown', e => startDrag(e.pageX));
container.addEventListener('mousemove', e => moveDrag(e.pageX));
container.addEventListener('mouseup', stopDrag);
container.addEventListener('mouseleave', stopDrag);

// ==== TOUCH ====
container.addEventListener('touchstart', e => {
    if (e.touches.length === 1) startDrag(e.touches[0].pageX);
}, {passive: true});

container.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
        e.preventDefault(); // блокируем нативный скролл, чтобы инерция работала
        moveDrag(e.touches[0].pageX);
    }
}, {passive: false});

container.addEventListener('touchend', stopDrag);
container.addEventListener('touchcancel', stopDrag);

// =========================
// 6. КЛИК ПО КАРТОЧКЕ
// =========================
cards.forEach(card => {
  card.addEventListener('click', () => {
    if (!card.isDragging) {
      const book = card.dataset.book;
      if (book) window.location.href = `book.html?book=${book}`;
    }
  });
});

// =========================
// 7. ИНЕРЦИЯ КОЛЕСИКОМ
// =========================
let scrollVelocity = 0;
let rafId = null;

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

  if (Math.abs(scrollVelocity) > 0.5) rafId = requestAnimationFrame(smoothScroll);
  else { rafId = null; scrollVelocity = 0; }
}