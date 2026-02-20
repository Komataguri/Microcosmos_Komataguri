const container = document.getElementById('carousel-container');
const carousel = document.getElementById('carousel');

// Оригинальные карточки
let originalCards = Array.from(document.querySelectorAll('.book-card'));

// =========================
// 1. КЛОНИРОВАНИЕ КАРТОЧЕК
// =========================
const clonesBefore = originalCards.slice().reverse().map(c => c.cloneNode(true));
clonesBefore.forEach(clone => carousel.insertBefore(clone, carousel.firstChild));

const clonesAfter = originalCards.map(c => c.cloneNode(true));
clonesAfter.forEach(clone => carousel.appendChild(clone));

let cards = Array.from(document.querySelectorAll('.book-card'));
const originalCount = originalCards.length;
const clonesCount = clonesBefore.length;

// =========================
// 2. РАСЧЁТ РАЗМЕРОВ
// =========================
const cardStyle = getComputedStyle(cards[0]);
let gap = 20; // фиксируем gap, как в CSS
const cardWidth = cards[0].offsetWidth + gap;

// =========================
// 3. УСТАНОВКА ПЕРВОЙ КАРТОЧКИ
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
    if (container.scrollLeft <= 0) {
        container.scrollLeft += originalCount * cardWidth;
    } else if (container.scrollLeft >= maxScroll) {
        container.scrollLeft -= originalCount * cardWidth;
    }
});

// =========================
// 5. DRAG СКРОЛЛ
// =========================
let isDragging = false;
let dragStartX = 0;
let scrollStart = 0;

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
});

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

    // Бесконечность при колесике
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
