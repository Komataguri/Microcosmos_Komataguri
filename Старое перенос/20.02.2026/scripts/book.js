// scripts/book.js
console.log('book.js загружен');

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', async () => {

    // === Проверка, что BOOKS загружены ===
    if (!window.BOOKS) {
      alert('Ошибка: данные книг не загружены. Подключите books.js перед book.js');
      return;
    }

    const BOOKS = window.BOOKS;

    // === Константы GitHub ===
    const REPO_OWNER = 'Komataguri';
    const REPO_NAME = 'Microcosmos_Komataguri';
    const BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/`;

    // === DOM элементы ===
    const loader = document.getElementById('loader');
    const tocList = document.getElementById('toc-list');
    const chapterContainer = document.getElementById('chapter-container');
    const chapterContent = document.getElementById('chapter-content');
    const stickers = document.querySelectorAll('.nav-sticker');
    const scrollSticker = document.getElementById('scrollSticker');
    const progressBar = document.getElementById('progressBar');

    // === Настройки ===
    let chapters = [];
    let currentChapterIndex = Number(localStorage.getItem('lastChapter') || 0);
    let stickersVisible = true;

    // === Определяем текущую книгу из URL ===
    const params = new URLSearchParams(window.location.search);
    const bookKey = params.get('book') || 'Book1';
    const BOOK = BOOKS[bookKey];

    if (!BOOK) {
      alert('Книга не найдена');
      return;
    }

    const BOOK_PATH = BOOK.path;

    // === Применяем данные книги ===
    document.title = BOOK.title;
    document.querySelector('.book-cover').src = BOOK.cover;
    const info = document.querySelector('.book-info');
    info.innerHTML = `
      <h2 class="book-title">${BOOK.title}</h2>
      <p><span class="label">Автор:</span> ${BOOK.author}</p>
      <p><span class="label">Год выпуска:</span> ${BOOK.year}</p>
      <p><span class="label">Количество глав:</span> ${BOOK.chaptersCount}</p>
      <p><span class="label">Жанры:</span> ${BOOK.genres}</p>
      <p class="book-description"><span class="label">Аннотация:</span> ${BOOK.description}</p>
    `;

    // =====================
    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    // =====================
    const debounce = (fn, delay = 80) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(null, args), delay);
      };
    };

    const toggleLoader = show => loader.style.display = show ? 'block' : 'none';

    const rewriteImagePaths = md =>
      md.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, path) =>
        `<img src="${BASE_URL}${BOOK_PATH}/${path.replace(/^\.\/?/, '')}" alt="${alt}" loading="lazy">`
      );

    const adjustFontSize = delta => {
      const min = 12, max = 22;
      let size = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size')) || 16;
      size = Math.min(max, Math.max(min, size + delta));
      document.documentElement.style.setProperty('--font-size', `${size}px`);
      localStorage.setItem('fontSize', size);
    };

    const resetFont = () => {
      document.documentElement.style.setProperty('--font-size', '16px');
      localStorage.setItem('fontSize', 16);
    };

    // =====================
    // === ЗАГРУЗКА TOC ===
    // =====================
    async function loadTableOfContents() {
      try {
        toggleLoader(true);
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${BOOK_PATH}`);
        if (!res.ok) throw new Error(res.status);

        chapters = (await res.json())
          .filter(f => f.name.endsWith('.md'))
          .sort((a,b) => (parseInt(a.name.match(/\d+/))||0) - (parseInt(b.name.match(/\d+/))||0));

        tocList.innerHTML = chapters.map((c,i) =>
          `<li class="toc-item"><a data-index="${i}">${c.name.replace('.md','')}</a></li>`).join('');

        tocList.querySelectorAll('a').forEach(a =>
          a.addEventListener('click', () => loadChapter(+a.dataset.index))
        );
      } catch(e) {
        tocList.innerHTML = `<li style="color:#ff5555">Ошибка загрузки: ${e.message}</li>`;
      } finally {
        toggleLoader(false);
      }
    }

    // =====================
    // === ЗАГРУЗКА ГЛАВЫ ===
    // =====================
    async function loadChapter(index) {
      try {
        toggleLoader(true);
        currentChapterIndex = index;
        localStorage.setItem('lastChapter', index);

        const chapter = chapters[index];
        if (!chapter) throw new Error('Глава не найдена');

        document.title = `${chapter.name.replace('.md','')} | ${BOOK.title}`;

        let md = localStorage.getItem(chapter.name);
        if (!md) {
          const res = await fetch(BASE_URL + chapter.path);
          if (!res.ok) throw new Error(res.status);
          md = await res.text();
          localStorage.setItem(chapter.name, md);
        }

        md = rewriteImagePaths(md);
        chapterContent.innerHTML = marked.parse(md);
        hljs.highlightAll();

        chapterContent.classList.remove('visible');
        setTimeout(() => chapterContent.classList.add('visible'), 10);
        chapterContainer.style.display = 'block';
        document.querySelector('header').style.display = 'none';
        document.querySelector('section').style.display = 'none';
        window.scrollTo(0,0);
      } catch(e) {
        chapterContent.innerHTML = `<p style="color:#ff5555;text-align:center">Ошибка загрузки главы</p>`;
      } finally {
        toggleLoader(false);
      }
    }

    // =====================
    // === НАВИГАЦИЯ МЕЖДУ ГЛАВАМИ ===
    // =====================
    const navigateChapter = dir => {
      const i = currentChapterIndex + dir;
      if (i >=0 && i<chapters.length) loadChapter(i);
      else alert(dir === 1 ? 'Это последняя глава' : 'Это первая глава');
    };

    const showTOC = () => {
      chapterContainer.style.display = 'none';
      document.querySelector('header').style.display = 'block';
      document.querySelector('section').style.display = 'block';
    };

    // =====================
    // === СТИКЕРЫ ===
    // =====================
    const themeSticker = document.getElementById('themeSticker');
    themeSticker.addEventListener('click', () => {
      const curr = localStorage.getItem('theme') || 'graphite';
      const next = curr === 'graphite' ? 'sepia' : 'graphite';
      document.body.classList.remove('theme-graphite','theme-sepia');
      document.body.classList.add(`theme-${next}`);
      localStorage.setItem('theme', next);
    });

    document.getElementById('fontInc').onclick = () => adjustFontSize(1);
    document.getElementById('fontDec').onclick = () => adjustFontSize(-1);
    document.getElementById('fontReset').onclick = resetFont;
    document.getElementById('homeSticker').onclick = () => location.href='index.html';
    document.getElementById('prevSticker').onclick = () => navigateChapter(-1);
    document.getElementById('nextSticker').onclick = () => navigateChapter(1);
    document.getElementById('tocSticker').onclick = showTOC;

    scrollSticker.onclick = () => {
      const bottom = document.documentElement.scrollHeight - innerHeight - 20;
      scrollTo({ top: scrollY>=bottom?0:bottom, behavior:'smooth' });
    };

    // =====================
    // === ПРОГРЕСС-БАР ===
    // =====================
    window.addEventListener('scroll', debounce(()=>{
      const h = document.documentElement.scrollHeight - innerHeight;
      progressBar.style.width = h>0?(scrollY/h*100)+'%':'0%';
    }));

    // =====================
    // === СКРЫТИЕ/ПОКАЗ СТИКЕРОВ ===
    // =====================
    document.body.addEventListener('click', e => {
      if (e.target.closest('.nav-sticker')) return;
      stickersVisible = !stickersVisible;
      stickers.forEach(s => s.classList.toggle('hidden-sticker', !stickersVisible));
    });

    // =====================
    // === ИНИЦИАЛИЗАЦИЯ ТЕМЫ И ШРИФТА ===
    // =====================
    const savedTheme = localStorage.getItem('theme') || 'graphite';
    document.body.classList.add(`theme-${savedTheme}`);
    const fs = localStorage.getItem('fontSize');
    if (fs) document.documentElement.style.setProperty('--font-size',`${fs}px`);

    // =====================
    // === ЗАГРУЗКА TOC И ГЛАВЫ ПО URL ===
    // =====================
    await loadTableOfContents();
    const q = new URLSearchParams(window.location.search).get('chapter');
    if(q){
      const i = chapters.findIndex(c=>c.name.includes(q));
      if(i>=0) loadChapter(i);
    }

  });
})();
