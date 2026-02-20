const container = document.getElementById('carousel-container');
const carousel = document.getElementById('carousel');
let originalCards = Array.from(document.querySelectorAll('.book-card'));

// =========================
// 1. КЛОНИРУЕМ КАРТОЧКИ
// =========================
const clonesBefore = originalCards.slice().reverse().map(c => c.cloneNode(true));
clonesBefore.forEach(clone => carousel.insertBefore(clone, carousel.firstChild));

const clonesAfter = originalCards.map(c => c.cloneNode(true));
clonesAfter.forEach(clone => carousel.appendChild(clone));

let cards = Array.from(document.querySelectorAll('.book-card'));

// Размеры
const totalCount = cards.length;
const originalCount = originalCards.length;
const cardStyle = getComputedStyle(cards[0]);
const gap = parseInt(cardStyle.marginRight || 35);
const cardWidth = cards[0].offsetWidth + gap;

// =========================
// 2. УСТАНОВКА НА ПЕРВУЮ КНИГУ СЛЕВА
// =========================
const firstOriginalIndex = clonesBefore.length;
container.scrollLeft = cards[firstOriginalIndex].offsetLeft;

// =========================
// 3. БЕСКОНЕЧНЫЙ СКРОЛЛ
// =========================
container.addEventListener('scroll', () => {
  if (container.scrollLeft <= 0) {
    container.scrollLeft += originalCount * cardWidth;
  } else if (container.scrollLeft >= (originalCount + clonesBefore.length) * cardWidth) {
    container.scrollLeft -= originalCount * cardWidth;
  }
});

// =========================
// 4. DRAG СКРОЛЛ
// =========================
let isDown = false;
let startX, scrollStart;

container.addEventListener('mousedown', e => {
  isDown = true;
  startX = e.pageX - container.offsetLeft;
  scrollStart = container.scrollLeft;
  cards.forEach(c => c.isDragging = false);
});

container.addEventListener('mouseleave', () => isDown = false);
container.addEventListener('mouseup', () => isDown = false);

container.addEventListener('mousemove', e => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - container.offsetLeft;
  const walk = x - startX;
  container.scrollLeft = scrollStart - walk;
  cards.forEach(c => c.isDragging = true);
});

// =========================
// 5. КЛИК ПО КАРТОЧКЕ
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
// 6. ИНЕРЦИЯ КОЛЕСИКОМ
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
  if (Math.abs(scrollVelocity) > 0.5) {
    rafId = requestAnimationFrame(smoothScroll);
  } else {
    rafId = null;
    scrollVelocity = 0;
    // Магнит удалён
  }
}
