'use strict';

(function initializeReader() {
  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const bookKey = params.get('book') || 'Book1';
    const book = window.BOOKS?.[bookKey];

    if (!book || book.status === 'soon') {
      window.location.replace('index.html');
      return;
    }

    const loader = document.getElementById('loader');
    const tocList = document.getElementById('toc-list');
    const chapterContainer = document.getElementById('chapter-container');
    const chapterContent = document.getElementById('chapter-content');
    const bookHeader = document.querySelector('header');
    const tocSection = document.querySelector('.toc-section');
    const stickers = document.querySelectorAll('.nav-sticker');
    const scrollSticker = document.getElementById('scrollSticker');
    const progressBar = document.getElementById('progressBar');
    const bookPath = book.path;

    const storagePrefix = `reader:${bookKey}`;
    const progressKey = `${storagePrefix}:progress`;
    const cacheIndexKey = 'reader:chapter-cache:v2';
    const maxCachedChapters = 20;

    let chapters = [];
    let currentChapterIndex = -1;
    let currentLoadToken = 0;
    let stickersVisible = true;
    let tocReady = false;
    let savedProgress = readJson(progressKey, null);

    function readJson(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    }

    function writeStorage(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }

    function readStorage(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }

    function removeStorage(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Настройки чтения необязательны. Сайт продолжит работать без них.
      }
    }

    function addInfoRow(container, label, value, className = '') {
      const row = document.createElement('p');
      if (className) row.className = className;

      const labelElement = document.createElement('span');
      labelElement.className = 'label';
      labelElement.textContent = `${label}:`;

      const valueElement = document.createElement('span');
      valueElement.textContent = ` ${value}`;

      row.append(labelElement, valueElement);
      container.appendChild(row);
      return valueElement;
    }

    function renderBookInfo() {
      document.title = book.title;
      const cover = document.querySelector('.book-cover');
      cover.src = book.cover;
      cover.alt = `Обложка книги «${book.title}»`;

      const info = document.querySelector('.book-info');
      info.replaceChildren();

      const title = document.createElement('h1');
      title.className = 'book-title';
      title.textContent = book.title;
      info.appendChild(title);

      addInfoRow(info, 'Автор', book.author);
      addInfoRow(info, 'Год выпуска', book.year);
      addInfoRow(info, 'Глав в оригинале', book.chaptersCount);
      const available = addInfoRow(info, 'Доступно на сайте', 'загрузка…');
      available.id = 'availableChapters';
      addInfoRow(info, 'Жанры', book.genres);

      const description = document.createElement('p');
      description.className = 'book-description';
      const descriptionLabel = document.createElement('span');
      descriptionLabel.className = 'label';
      descriptionLabel.textContent = 'Аннотация:';
      const descriptionText = document.createElement('span');
      descriptionText.className = 'book-description-text';
      descriptionText.textContent = ` ${book.description}`;
      description.append(descriptionLabel, descriptionText);
      info.appendChild(description);

      const continuePanel = document.createElement('div');
      continuePanel.id = 'continueReading';
      continuePanel.className = 'continue-reading';
      continuePanel.hidden = true;

      const continueButton = document.createElement('button');
      continueButton.id = 'continueButton';
      continueButton.className = 'continue-button';
      continueButton.type = 'button';
      continueButton.textContent = 'Продолжить чтение';

      const continueTitle = document.createElement('span');
      continueTitle.id = 'continueTitle';
      continueTitle.className = 'continue-title';

      continuePanel.append(continueButton, continueTitle);
      info.appendChild(continuePanel);
    }

    function debounce(callback, delay = 100) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback(...args), delay);
      };
    }

    function toggleLoader(show) {
      loader.hidden = !show;
    }

    function chapterCacheKey(file) {
      return `${storagePrefix}:chapter:${file}`;
    }

    function getCachedChapter(file) {
      try {
        return localStorage.getItem(chapterCacheKey(file));
      } catch {
        return null;
      }
    }

    function cacheChapter(file, markdown) {
      const key = chapterCacheKey(file);
      const cached = readJson(cacheIndexKey, []).filter(item => item?.key !== key);
      cached.push({ key, savedAt: Date.now() });

      while (cached.length > maxCachedChapters) {
        const oldest = cached.shift();
        if (oldest?.key) removeStorage(oldest.key);
      }

      if (writeStorage(key, markdown)) {
        writeStorage(cacheIndexKey, JSON.stringify(cached));
      }
    }

    function rewriteImagePaths(markdown) {
      return markdown.replace(
        /!\[(.*?)\]\((.*?)\)/g,
        (_, alt, path) => `<img src="${bookPath}/${path.replace(/^\.\/?/, '')}" alt="${alt}" loading="lazy" draggable="false">`
      );
    }

    function buildUrl(chapterFile = null) {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('book', bookKey);
      if (chapterFile) url.searchParams.set('chapter', chapterFile);
      return url;
    }

    function setHistory(chapterFile, mode = 'push') {
      if (!mode) return;
      const method = mode === 'replace' ? 'replaceState' : 'pushState';
      history[method]({ book: bookKey, chapter: chapterFile }, '', buildUrl(chapterFile));
    }

    function resolveChapterIndex(value) {
      if (!value) return -1;
      const exact = chapters.findIndex(chapter => chapter.file === value);
      if (exact >= 0) return exact;
      return chapters.findIndex(chapter => chapter.file.includes(value));
    }

    function updateTocState() {
      tocList.querySelectorAll('.toc-item').forEach((item, index) => {
        item.classList.toggle('active', index === currentChapterIndex);
        item.classList.toggle('last-read', chapters[index]?.file === savedProgress?.file);
      });
    }

    function updateContinuePanel() {
      const panel = document.getElementById('continueReading');
      const button = document.getElementById('continueButton');
      const title = document.getElementById('continueTitle');
      const index = resolveChapterIndex(savedProgress?.file);

      if (index < 0) {
        panel.hidden = true;
        return;
      }

      panel.hidden = false;
      title.textContent = chapters[index].title;
      button.onclick = () => loadChapter(index, {
        historyMode: 'push',
        restoreScroll: true
      });
    }

    function saveProgress(scrollPosition = window.scrollY, updateUi = true) {
      const chapter = chapters[currentChapterIndex];
      if (!chapter) return;

      savedProgress = {
        file: chapter.file,
        index: currentChapterIndex,
        title: chapter.title,
        scrollY: Math.max(0, Math.round(scrollPosition)),
        updatedAt: Date.now()
      };

      writeStorage(progressKey, JSON.stringify(savedProgress));
      if (updateUi) {
        updateTocState();
        updateContinuePanel();
      }
    }

    function migrateLegacyProgress() {
      if (savedProgress || bookKey !== 'Book1') return;
      try {
        const legacyValue = readStorage('lastChapter');
        const legacyIndex = Number(legacyValue);
        if (legacyValue !== null && Number.isInteger(legacyIndex) && chapters[legacyIndex]) {
          savedProgress = {
            file: chapters[legacyIndex].file,
            index: legacyIndex,
            title: chapters[legacyIndex].title,
            scrollY: 0,
            updatedAt: Date.now()
          };
          writeStorage(progressKey, JSON.stringify(savedProgress));
        }
        removeStorage('lastChapter');
      } catch {
        // Старые данные можно безопасно проигнорировать.
      }
    }

    function renderTocError(message) {
      tocList.replaceChildren();
      const item = document.createElement('li');
      item.className = 'load-error';
      const text = document.createElement('p');
      text.textContent = `Не удалось загрузить оглавление: ${message}`;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'retry-button';
      retry.textContent = 'Попробовать снова';
      retry.onclick = loadTableOfContents;
      item.append(text, retry);
      tocList.appendChild(item);
    }

    async function loadTableOfContents() {
      try {
        toggleLoader(true);
        const response = await fetch(`${bookPath}/chapters.json`);
        if (!response.ok) throw new Error(`код ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('неверный формат данных');
        chapters = data.filter(chapter => chapter?.file && chapter?.title);
        tocReady = true;

        tocList.replaceChildren();
        chapters.forEach((chapter, index) => {
          const item = document.createElement('li');
          item.className = 'toc-item';

          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'toc-link';
          button.textContent = chapter.title;
          button.addEventListener('click', () => loadChapter(index, { historyMode: 'push' }));

          item.appendChild(button);
          tocList.appendChild(item);
        });

        document.getElementById('availableChapters').textContent = String(chapters.length);
        migrateLegacyProgress();
        updateTocState();
        updateContinuePanel();
      } catch (error) {
        renderTocError(error.message || 'неизвестная ошибка');
      } finally {
        toggleLoader(false);
      }
    }

    function showChapterError(index, error) {
      chapterContent.replaceChildren();
      const box = document.createElement('div');
      box.className = 'load-error chapter-error';
      const message = document.createElement('p');
      message.textContent = `Не удалось загрузить главу: ${error.message || 'неизвестная ошибка'}`;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'retry-button';
      retry.textContent = 'Попробовать снова';
      retry.onclick = () => loadChapter(index, { historyMode: null });
      box.append(message, retry);
      chapterContent.appendChild(box);
      chapterContent.classList.add('visible');
    }

    async function loadChapter(index, options = {}) {
      const { historyMode = 'push', restoreScroll = false } = options;
      const chapter = chapters[index];
      if (!chapter) return;

      const token = ++currentLoadToken;
      toggleLoader(true);
      chapterContent.classList.add('is-loading');

      try {
        let markdown = getCachedChapter(chapter.file);
        if (!markdown) {
          const response = await fetch(`${bookPath}/${chapter.file}`);
          if (!response.ok) throw new Error(`код ${response.status}`);
          markdown = await response.text();
          cacheChapter(chapter.file, markdown);
        }

        if (token !== currentLoadToken) return;

        currentChapterIndex = index;
        document.title = `${chapter.title} | ${book.title}`;
        chapterContent.innerHTML = marked.parse(rewriteImagePaths(markdown));
        chapterContent.classList.remove('visible');
        chapterContainer.hidden = false;
        bookHeader.hidden = true;
        tocSection.hidden = true;
        setHistory(chapter.file, historyMode);

        const canRestore = restoreScroll && savedProgress?.file === chapter.file;
        const scrollPosition = canRestore ? Number(savedProgress.scrollY) || 0 : 0;
        saveProgress(scrollPosition);
        updateTocState();

        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollPosition, behavior: 'auto' });
          chapterContent.classList.add('visible');
        });
      } catch (error) {
        if (token !== currentLoadToken) return;
        currentChapterIndex = index;
        chapterContainer.hidden = false;
        bookHeader.hidden = true;
        tocSection.hidden = true;
        showChapterError(index, error);
      } finally {
        if (token === currentLoadToken) {
          chapterContent.classList.remove('is-loading');
          toggleLoader(false);
        }
      }
    }

    function navigateChapter(direction) {
      const fallback = resolveChapterIndex(savedProgress?.file);
      const origin = currentChapterIndex >= 0 ? currentChapterIndex : fallback;
      const nextIndex = origin + direction;

      if (nextIndex >= 0 && nextIndex < chapters.length) {
        loadChapter(nextIndex, { historyMode: 'push' });
        return;
      }

      alert(direction === 1 ? 'Это последняя глава' : 'Это первая глава');
    }

    function showTableOfContents(options = {}) {
      const { historyMode = 'push' } = options;
      if (currentChapterIndex >= 0) saveProgress();
      chapterContainer.hidden = true;
      bookHeader.hidden = false;
      tocSection.hidden = false;
      document.title = book.title;
      setHistory(null, historyMode);
      updateTocState();
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    }

    function adjustFontSize(delta) {
      const min = 14;
      const max = 24;
      const current = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--font-size'),
        10
      ) || 16;
      const size = Math.min(max, Math.max(min, current + delta));
      document.documentElement.style.setProperty('--font-size', `${size}px`);
      writeStorage('reader:font-size', String(size));
    }

    function resetFont() {
      document.documentElement.style.setProperty('--font-size', '16px');
      writeStorage('reader:font-size', '16');
    }

    function initializeControls() {
      const savedTheme = readStorage('reader:theme') || readStorage('theme') || 'graphite';
      document.body.classList.add(`theme-${savedTheme}`);

      const savedFontSize = readStorage('reader:font-size') || readStorage('fontSize');
      if (savedFontSize) {
        const safeSize = Math.min(24, Math.max(14, Number(savedFontSize) || 16));
        document.documentElement.style.setProperty('--font-size', `${safeSize}px`);
      }

      document.getElementById('themeSticker').addEventListener('click', () => {
        const current = document.body.classList.contains('theme-sepia') ? 'sepia' : 'graphite';
        const next = current === 'graphite' ? 'sepia' : 'graphite';
        document.body.classList.remove('theme-graphite', 'theme-sepia');
        document.body.classList.add(`theme-${next}`);
        writeStorage('reader:theme', next);
      });

      document.getElementById('fontInc').onclick = () => adjustFontSize(1);
      document.getElementById('fontDec').onclick = () => adjustFontSize(-1);
      document.getElementById('fontReset').onclick = resetFont;
      document.getElementById('homeSticker').onclick = () => {
        if (currentChapterIndex >= 0) saveProgress();
        location.href = 'index.html';
      };
      document.getElementById('prevSticker').onclick = () => navigateChapter(-1);
      document.getElementById('nextSticker').onclick = () => navigateChapter(1);
      document.getElementById('tocSticker').onclick = () => showTableOfContents();

      scrollSticker.onclick = () => {
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const atBottom = window.scrollY >= maximum - 12;
        window.scrollTo({ top: atBottom ? 0 : maximum, behavior: 'smooth' });
      };
    }

    const handleScroll = debounce(() => {
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      const percent = maximum > 0 ? (window.scrollY / maximum) * 100 : 0;
      progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      scrollSticker.textContent = window.scrollY >= maximum - 12 ? '↑' : '↓';
      scrollSticker.setAttribute(
        'aria-label',
        window.scrollY >= maximum - 12 ? 'В начало страницы' : 'В конец страницы'
      );
      if (!chapterContainer.hidden && currentChapterIndex >= 0) saveProgress(window.scrollY, false);
    }, 120);

    renderBookInfo();
    initializeControls();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', () => {
      if (!chapterContainer.hidden && currentChapterIndex >= 0) saveProgress(window.scrollY, false);
    });

    document.body.addEventListener('click', event => {
      if (chapterContainer.hidden || event.target.closest('button, a, .nav-sticker')) return;
      stickersVisible = !stickersVisible;
      stickers.forEach(sticker => sticker.classList.toggle('hidden-sticker', !stickersVisible));
    });

    window.addEventListener('popstate', () => {
      const chapterFile = new URLSearchParams(window.location.search).get('chapter');
      const index = resolveChapterIndex(chapterFile);
      if (index >= 0) {
        loadChapter(index, {
          historyMode: null,
          restoreScroll: savedProgress?.file === chapters[index].file
        });
      } else {
        showTableOfContents({ historyMode: null });
      }
    });

    document.addEventListener('keydown', event => {
      if (chapterContainer.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft') navigateChapter(-1);
      if (event.key === 'ArrowRight') navigateChapter(1);
    });

    await loadTableOfContents();

    if (!tocReady) return;

    const requestedChapter = params.get('chapter');
    const requestedIndex = resolveChapterIndex(requestedChapter);
    if (requestedChapter && requestedIndex < 0) {
      const notice = document.createElement('li');
      notice.className = 'load-error';
      notice.textContent = 'Глава из ссылки не найдена. Выберите главу из оглавления.';
      tocList.prepend(notice);
    } else if (requestedIndex >= 0) {
      await loadChapter(requestedIndex, {
        historyMode: 'replace',
        restoreScroll: savedProgress?.file === chapters[requestedIndex].file
      });
    } else {
      setHistory(null, 'replace');
    }
  });
})();
