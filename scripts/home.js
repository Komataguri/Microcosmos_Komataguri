'use strict';

(function renderBookCatalog() {
  const carousel = document.getElementById('carousel');
  if (!carousel || !window.BOOKS) return;

  const books = Object.entries(window.BOOKS)
    .sort(([, first], [, second]) => first.id - second.id);

  books.forEach(([bookKey, book]) => {
    const card = document.createElement('button');
    const isSoon = book.status === 'soon';

    card.type = 'button';
    card.className = `book-card${isSoon ? ' book-card-soon' : ''}`;
    card.dataset.book = bookKey;
    card.dataset.status = book.status;
    card.setAttribute('aria-disabled', String(isSoon));
    card.setAttribute(
      'aria-label',
      isSoon ? 'Будущий книжный проект. Скоро' : `Открыть книгу «${book.title}»`
    );

    if (isSoon) card.tabIndex = -1;

    const pages = document.createElement('span');
    pages.className = 'book-pages';
    pages.setAttribute('aria-hidden', 'true');

    const cover = document.createElement('span');
    cover.className = 'book-cover';
    cover.style.backgroundImage = `url('${book.cover}')`;
    cover.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'book-label';
    label.textContent = book.cardTitle || book.title;

    cover.appendChild(label);
    card.append(pages, cover);
    carousel.appendChild(card);
  });

})();

(function initializeHomeControls() {
  const burgerButton = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const carouselContainer = document.getElementById('carousel-container');
  const viewButtons = document.querySelectorAll('.view-btn');
  const heroVideo = document.getElementById('heroVideo');

  if (!burgerButton || !mobileMenu || !carouselContainer) return;

  function setMenuOpen(open) {
    mobileMenu.classList.toggle('open', open);
    burgerButton.classList.toggle('open', open);
    burgerButton.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function applyView(view) {
    const safeView = view === 'grid' ? 'grid' : 'large';
    carouselContainer.classList.toggle('view-grid', safeView === 'grid');
    viewButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.view === safeView);
      button.setAttribute('aria-pressed', String(button.dataset.view === safeView));
    });
  }

  function readSavedView() {
    try {
      return localStorage.getItem('carouselView') || 'large';
    } catch {
      return 'large';
    }
  }

  function saveView(view) {
    try {
      localStorage.setItem('carouselView', view);
    } catch {
      // Выбор вида останется активным до закрытия страницы.
    }
  }

  burgerButton.addEventListener('click', () => {
    setMenuOpen(!mobileMenu.classList.contains('open'));
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('click', event => {
    if (
      mobileMenu.classList.contains('open') &&
      !mobileMenu.contains(event.target) &&
      !burgerButton.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenuOpen(false);
  });

  applyView(readSavedView());

  if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.pause();
  }

  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      applyView(view);
      saveView(view);
      carouselContainer.style.scrollSnapType = 'none';
      carouselContainer.scrollLeft = 0;
      setTimeout(() => {
        carouselContainer.style.scrollSnapType = '';
      }, 100);
    });
  });
})();
