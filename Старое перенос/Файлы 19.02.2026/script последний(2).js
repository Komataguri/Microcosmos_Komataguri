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
let gap = parseInt(cardStyle.marginRight || 20); // ✅ Изменено: уменьшили gap между карточками
const cardWidth = cards[0].offsetWidth + gap;

// =========================
// 3. УСТАНОВКА ПЕРВОЙ КАРТОЧКИ
// =========================
const firstOriginalIndex = clonesBefore.length;

function positionFirstCard() {
    const firstCard = cards[firstOriginalIndex];
    if (!firstCard) return;

    if (window.innerWidth > 768) {
        // ПК версия — первая карточка полностью слева
        container.scrollLeft = firstCard.offsetLeft;

        // ✅ Можно поднять блок карусели выше, если нужно
        // container.style.marginTop = "-30px"; // пример, меняется по желанию

        // Проверка, помещаются ли 5 карточек полностью
        const totalWidth5 = cards.slice(firstOriginalIndex, firstOriginalIndex + 5)
            .reduce((sum, c) => sum + c.offsetWidth + gap, -gap);

        if (totalWidth5 < container.offsetWidth) {
            carousel.style.paddingRight = '0px';
        } else {
            carousel.style.paddingRight = '10px';
        }

    } else {
        // Мобильная версия — центрирование первой карточки
        const containerCenter = container.offsetWidth / 2;
        const cardCenter = firstCard.offsetLeft + firstCard.offsetWidth / 2;
        container.scrollLeft = cardCenter - containerCenter;
    }
}

// Инициируем позицию первой карточки
positionFirstCard();
window.addEventListener('resize', positionFirstCard);

// =========================
// 4. БЕСКОНЕЧНЫЙ СКРОЛЛ
// =========================
container.addEventListener('scroll', () => {
    if (container.scrollLeft <= 0) {
        container.scrollLeft += originalCount * cardWidth;
    } else if (container.scrollLeft >= (originalCount + clonesCount) * cardWidth) {
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
    if (Math.abs(scrollVelocity) > 0.5) {
        rafId = requestAnimationFrame(smoothScroll);
    } else {
        rafId = null;
        scrollVelocity = 0;
    }
}
