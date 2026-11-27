(() => {
  const storageKey = 'watchdeck.watchlist.v1';
  const watchlistContainer = document.querySelector('[data-watchlist-results]');
  let announcement = document.querySelector('[data-watchlist-announcement]');

  if (!announcement) {
    announcement = document.createElement('p');
    announcement.className = 'visually-hidden';
    announcement.setAttribute('aria-live', 'polite');
    document.body.appendChild(announcement);
  }

  function normalizeItem(item) {
    if (!item || !['movie', 'tv'].includes(item.type) || item.id == null) return null;

    const id = String(item.id);
    if (!/^[1-9]\d*$/.test(id)) return null;

    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!title) return null;

    const rawYear = String(item.year ?? '');
    const posterPath = typeof item.posterPath === 'string' &&
      /^\/[A-Za-z0-9._/-]+$/.test(item.posterPath)
      ? item.posterPath
      : '';

    return {
      id,
      type: item.type,
      title,
      year: /^\d{4}$/.test(rawYear) ? rawYear : '',
      posterPath
    };
  }

  function readItems() {
    try {
      const storedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(storedItems)
        ? storedItems.map(normalizeItem).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  function writeItems(items) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
      return true;
    } catch {
      announcement.textContent = 'Die Watchlist konnte in diesem Browser nicht gespeichert werden.';
      return false;
    }
  }

  function itemKey(item) {
    return `${item.type}:${item.id}`;
  }

  function updateAddButtons() {
    const savedKeys = new Set(readItems().map(itemKey));

    document.querySelectorAll('[data-watchlist-add]').forEach(button => {
      const saved = savedKeys.has(`${button.dataset.type}:${button.dataset.id}`);
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved
        ? 'Aus Watchlist entfernen'
        : 'Zur Watchlist hinzufügen';
    });
  }

  function createWatchlistCard(item) {
    const column = document.createElement('div');
    column.className = 'col';

    const card = document.createElement('article');
    card.className = 'movie-card';

    if (item.posterPath) {
      const poster = document.createElement('img');
      poster.className = 'd-block w-100 rounded';
      poster.src = `https://image.tmdb.org/t/p/w500${item.posterPath}`;
      poster.alt = `Poster zu ${item.title}`;
      poster.loading = 'lazy';
      poster.style.aspectRatio = '2 / 3';
      poster.style.objectFit = 'cover';
      card.appendChild(poster);
    }

    const info = document.createElement('div');
    info.className = 'movie-info text-break';

    const title = document.createElement('h2');
    title.className = 'h6 mb-1';
    title.textContent = item.title;
    info.appendChild(title);

    const metadata = document.createElement('span');
    metadata.className = 'watchlist-metadata';
    metadata.textContent = `${item.year || 'Jahr offen'} · ${item.type === 'tv' ? 'Serie' : 'Film'}`;
    info.appendChild(metadata);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-sm watchlist-button watchlist-remove-button';
    removeButton.dataset.watchlistRemove = '';
    removeButton.dataset.id = item.id;
    removeButton.dataset.type = item.type;
    removeButton.textContent = 'Entfernen';
    removeButton.setAttribute('aria-label', `${item.title} aus der Watchlist entfernen`);
    info.appendChild(removeButton);

    card.appendChild(info);
    column.appendChild(card);
    return column;
  }

  function renderWatchlist() {
    if (!watchlistContainer) return;

    const items = readItems();
    if (items.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'content-panel';

      const message = document.createElement('p');
      message.textContent = 'Deine Watchlist ist noch leer. Füge Filme oder Serien über „Zur Watchlist hinzufügen“ hinzu.';
      emptyState.appendChild(message);

      const links = document.createElement('p');
      links.className = 'mb-0';

      const moviesLink = document.createElement('a');
      moviesLink.href = '/movies';
      moviesLink.textContent = 'Filme ansehen';
      links.appendChild(moviesLink);

      links.append(' · ');

      const seriesLink = document.createElement('a');
      seriesLink.href = '/tvshows';
      seriesLink.textContent = 'Serien ansehen';
      links.appendChild(seriesLink);
      emptyState.appendChild(links);

      watchlistContainer.replaceChildren(emptyState);
      return;
    }

    const row = document.createElement('div');
    row.className = 'row row-cols-2 row-cols-md-3 row-cols-lg-5 g-2 g-md-4';
    items.forEach(item => row.appendChild(createWatchlistCard(item)));
    watchlistContainer.replaceChildren(row);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-watchlist-add], [data-watchlist-remove]');
    if (!button) return;

    const type = button.dataset.type;
    const id = String(button.dataset.id || '');
    if (!['movie', 'tv'].includes(type) || !id) return;

    const items = readItems();
    const existingIndex = items.findIndex(item => itemKey(item) === `${type}:${id}`);
    let announcementText;

    if (button.hasAttribute('data-watchlist-remove') || existingIndex >= 0) {
      if (existingIndex >= 0) items.splice(existingIndex, 1);
      announcementText = 'Aus der Watchlist entfernt.';
    } else {
      const item = normalizeItem({
        id,
        type,
        title: button.dataset.title,
        year: button.dataset.year,
        posterPath: button.dataset.posterPath
      });
      if (!item) return;
      items.push(item);
      announcementText = 'Zur Watchlist hinzugefügt.';
    }

    if (!writeItems(items)) return;

    announcement.textContent = announcementText;
    updateAddButtons();
    renderWatchlist();
  });

  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    updateAddButtons();
    renderWatchlist();
  });

  updateAddButtons();
  renderWatchlist();
})();
