(() => {
  const storageKey = 'watchdeck.watchlists.v2';
  const legacyStorageKey = 'watchdeck.watchlist.v1';
  const watchlistContainer = document.querySelector('[data-watchlist-results]');
  const directoryContainer = document.querySelector('[data-status-directory]');
  const listSelect = document.querySelector('[data-watchlist-select]');
  const statusFilter = document.querySelector('[data-status-filter]');
  const createForm = document.querySelector('[data-watchlist-create]');
  const renameForm = document.querySelector('[data-watchlist-rename]');
  const renameInput = renameForm?.elements.namedItem('name');
  const deleteButton = document.querySelector('[data-watchlist-delete]');
  const pickerDialog = document.querySelector('[data-watchlist-dialog]');
  const pickerItemLabel = document.querySelector('[data-watchlist-dialog-item]');
  const pickerSelect = document.querySelector('[data-watchlist-target]');
  const pickerStatus = document.querySelector('[data-watchlist-dialog-status]');
  const pickerAddButton = document.querySelector('[data-watchlist-dialog-add]');
  const pickerRemoveButton = document.querySelector('[data-watchlist-dialog-remove]');
  const pickerCloseButton = document.querySelector('[data-watchlist-dialog-close]');
  let announcement = document.querySelector('[data-watchlist-announcement]');
  let pendingItem = null;
  const statusOptions = [
    { value: 'watching', label: 'Schaue gerade' },
    { value: 'completed', label: 'Fertig geschaut' },
    { value: 'want', label: 'Will schauen' },
    { value: 'dropped', label: 'Abgebrochen' },
    { value: 'paused', label: 'Pausiert' }
  ];

  if (!announcement) {
    announcement = document.createElement('p');
    announcement.className = 'visually-hidden';
    announcement.setAttribute('aria-live', 'polite');
    document.body.appendChild(announcement);
  }

  function createListId() {
    return `list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
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

  function normalizeStatusEntry(entry) {
    if (!entry || !statusOptions.some(option => option.value === entry.status)) return null;
    const item = normalizeItem(entry);
    return item ? { ...item, status: entry.status } : null;
  }

  function normalizeList(list) {
    if (!list || typeof list !== 'object') return null;

    const id = typeof list.id === 'string' && list.id ? list.id : createListId();
    const name = typeof list.name === 'string' && list.name.trim()
      ? list.name.trim().slice(0, 40)
      : 'Meine Watchlist';
    const items = Array.isArray(list.items)
      ? list.items.map(normalizeItem).filter(Boolean)
      : [];
    const seenItems = new Set();

    return {
      id,
      name,
      items: items.filter(item => {
        const key = `${item.type}:${item.id}`;
        if (seenItems.has(key)) return false;
        seenItems.add(key);
        return true;
      })
    };
  }

  function createDefaultState(items = []) {
    const list = {
      id: createListId(),
      name: 'Meine Watchlist',
      items
    };
    return { lists: [list], activeListId: list.id, statusEntries: [] };
  }

  function normalizeState(value) {
    const lists = Array.isArray(value?.lists)
      ? value.lists.map(normalizeList).filter(Boolean)
      : [];
    const seenIds = new Set();

    for (const list of lists) {
      while (seenIds.has(list.id)) list.id = createListId();
      seenIds.add(list.id);
    }

    const statusByKey = new Map();
    const statusEntries = Array.isArray(value?.statusEntries)
      ? value.statusEntries.map(normalizeStatusEntry).filter(Boolean)
      : [];
    statusEntries.forEach(item => statusByKey.set(itemKey(item), item));

    if (lists.length === 0) {
      return { ...createDefaultState(), statusEntries: [...statusByKey.values()] };
    }

    const activeListId = lists.some(list => list.id === value?.activeListId)
      ? value.activeListId
      : lists[0].id;
    return { lists, activeListId, statusEntries: [...statusByKey.values()] };
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return normalizeState(JSON.parse(stored));
    } catch {
      // Start with a local default if browser storage is unavailable or invalid.
    }

    let oldItems = [];
    try {
      const legacy = JSON.parse(localStorage.getItem(legacyStorageKey) || '[]');
      if (Array.isArray(legacy)) oldItems = legacy.map(normalizeItem).filter(Boolean);
    } catch {
      // Ignore invalid legacy data and create a fresh list.
    }

    const state = normalizeState(createDefaultState(oldItems));
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      localStorage.removeItem(legacyStorageKey);
    } catch {
      // The list still works for this page if persistent storage is blocked.
    }
    return state;
  }

  let state = loadState();

  function copyState() {
    return {
      activeListId: state.activeListId,
      lists: state.lists.map(list => ({ ...list, items: [...list.items] })),
      statusEntries: state.statusEntries.map(item => ({ ...item }))
    };
  }

  function saveState(nextState) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState));
      state = nextState;
      return true;
    } catch {
      announcement.textContent = 'Die Watchlists konnten in diesem Browser nicht gespeichert werden.';
      return false;
    }
  }

  function activeList() {
    return state.lists.find(list => list.id === state.activeListId) || state.lists[0];
  }

  function itemKey(item) {
    return `${item.type}:${item.id}`;
  }

  function updateAddButtons() {
    document.querySelectorAll('[data-watchlist-add]').forEach(button => {
      const key = `${button.dataset.type}:${button.dataset.id}`;
      const savedIn = state.lists.filter(list => list.items.some(item => itemKey(item) === key));
      button.textContent = 'Zur Watchlist hinzufügen';
      button.title = savedIn.length > 0
        ? `Bereits gespeichert in: ${savedIn.map(list => list.name).join(', ')}. Klicken zum Auswählen.`
        : 'Klicken, um eine Watchlist auszuwählen.';
    });
  }

  function updateStatusControls() {
    const statuses = new Map(state.statusEntries.map(item => [itemKey(item), item.status]));
    document.querySelectorAll('[data-status-select]').forEach(select => {
      select.value = statuses.get(`${select.dataset.type}:${select.dataset.id}`) || '';
    });
  }

  function createStatusSelect(item) {
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm movie-status-select';
    select.dataset.statusSelect = '';
    select.dataset.id = item.id;
    select.dataset.type = item.type;
    select.dataset.title = item.title;
    select.dataset.year = item.year || '';
    select.dataset.posterPath = item.posterPath || '';
    select.setAttribute('aria-label', `Status für ${item.title}`);

    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Status auswählen';
    select.appendChild(emptyOption);

    statusOptions.forEach(status => {
      const option = document.createElement('option');
      option.value = status.value;
      option.textContent = status.label;
      select.appendChild(option);
    });

    const saved = state.statusEntries.find(entry => itemKey(entry) === itemKey(item));
    select.value = saved?.status || item.status || '';
    return select;
  }

  function renderPickerOptions() {
    if (!pickerSelect) return;

    const selectedId = pickerSelect.value;
    pickerSelect.replaceChildren();
    state.lists.forEach(list => {
      const option = document.createElement('option');
      option.value = list.id;
      option.textContent = list.name;
      pickerSelect.appendChild(option);
    });
    pickerSelect.value = state.lists.some(list => list.id === selectedId)
      ? selectedId
      : activeList().id;
  }

  function updatePickerState() {
    if (!pendingItem || !pickerSelect) return;

    const list = state.lists.find(item => item.id === pickerSelect.value) || activeList();
    const alreadySaved = list.items.some(item => itemKey(item) === itemKey(pendingItem));
    pickerStatus.textContent = alreadySaved
      ? `„${pendingItem.title}“ ist bereits in „${list.name}“ gespeichert.`
      : `„${pendingItem.title}“ wird zu „${list.name}“ hinzugefügt.`;
    pickerAddButton.hidden = alreadySaved;
    pickerRemoveButton.hidden = !alreadySaved;
    pickerRemoveButton.textContent = `Aus „${list.name}“ entfernen`;
  }

  function openPicker(item) {
    if (!pickerDialog || !pickerSelect) return;

    pendingItem = item;
    pickerItemLabel.textContent = item.title;
    renderPickerOptions();
    pickerSelect.value = activeList().id;
    updatePickerState();
    pickerDialog.showModal();
  }

  function detailUrl(item) {
    const section = item.type === 'tv' ? 'tvshows' : 'movies';
    return `/${section}/${encodeURIComponent(item.id)}`;
  }

  function createWatchlistCard(item) {
    const column = document.createElement('div');
    column.className = 'col';

    const card = document.createElement('article');
    card.className = 'movie-card';

    if (item.posterPath) {
      const posterLink = document.createElement('a');
      posterLink.href = detailUrl(item);
      posterLink.setAttribute('aria-label', `Details zu ${item.title} öffnen`);

      const poster = document.createElement('img');
      poster.className = 'd-block w-100 rounded';
      poster.src = `https://image.tmdb.org/t/p/w500${item.posterPath}`;
      poster.alt = `Poster zu ${item.title}`;
      poster.loading = 'lazy';
      poster.style.aspectRatio = '2 / 3';
      poster.style.objectFit = 'cover';
      posterLink.appendChild(poster);
      card.appendChild(posterLink);
    }

    const info = document.createElement('div');
    info.className = 'movie-info text-break';

    const title = document.createElement('h2');
    title.className = 'h6 mb-1';

    const titleLink = document.createElement('a');
    titleLink.className = 'watchlist-title-link';
    titleLink.href = detailUrl(item);
    titleLink.textContent = item.title;
    title.appendChild(titleLink);
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
    removeButton.textContent = 'Aus dieser Watchlist entfernen';
    removeButton.setAttribute('aria-label', `${item.title} aus der Watchlist entfernen`);
    info.appendChild(removeButton);
    info.appendChild(createStatusSelect(item));

    card.appendChild(info);
    column.appendChild(card);
    return column;
  }

  function renderListControls() {
    if (listSelect) {
      listSelect.replaceChildren();
      state.lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.name;
        listSelect.appendChild(option);
      });
      listSelect.value = activeList().id;
    }

    if (renameInput && document.activeElement !== renameInput) {
      renameInput.value = activeList().name;
    }
  }

  function renderWatchlist() {
    if (!watchlistContainer) return;

    const list = activeList();
    if (list.items.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'content-panel';

      const message = document.createElement('p');
      message.textContent = `„${list.name}“ ist noch leer. Füge Filme oder Serien über „Zur Watchlist hinzufügen“ hinzu.`;
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
    list.items.forEach(item => row.appendChild(createWatchlistCard(item)));
    watchlistContainer.replaceChildren(row);
  }

  function createDirectoryCard(item) {
    const column = document.createElement('div');
    column.className = 'col';

    const card = document.createElement('article');
    card.className = 'movie-card';

    if (item.posterPath) {
      const posterLink = document.createElement('a');
      posterLink.href = detailUrl(item);
      posterLink.setAttribute('aria-label', `Details zu ${item.title} öffnen`);

      const poster = document.createElement('img');
      poster.className = 'd-block w-100 rounded';
      poster.src = `https://image.tmdb.org/t/p/w500${item.posterPath}`;
      poster.alt = `Poster zu ${item.title}`;
      poster.loading = 'lazy';
      poster.style.aspectRatio = '2 / 3';
      poster.style.objectFit = 'cover';
      posterLink.appendChild(poster);
      card.appendChild(posterLink);
    }

    const info = document.createElement('div');
    info.className = 'movie-info text-break';

    const heading = document.createElement('h2');
    heading.className = 'h6 mb-1';
    const titleLink = document.createElement('a');
    titleLink.className = 'watchlist-title-link';
    titleLink.href = detailUrl(item);
    titleLink.textContent = item.title;
    heading.appendChild(titleLink);
    info.appendChild(heading);

    const metadata = document.createElement('span');
    metadata.className = 'watchlist-metadata';
    metadata.textContent = `${item.year || 'Jahr offen'} · ${item.type === 'tv' ? 'Serie' : 'Film'}`;
    info.appendChild(metadata);
    info.appendChild(createStatusSelect(item));

    card.appendChild(info);
    column.appendChild(card);
    return column;
  }

  function renderStatusDirectory() {
    if (!directoryContainer) return;

    directoryContainer.replaceChildren();
    const selectedStatus = statusFilter?.value || '';
    const matchingEntries = state.statusEntries.filter(item =>
      !selectedStatus || item.status === selectedStatus
    );

    if (matchingEntries.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'content-panel';
      const message = document.createElement('p');
      if (selectedStatus) {
        const label = statusOptions.find(status => status.value === selectedStatus)?.label;
        message.textContent = `Im Status „${label}“ gibt es noch keine Titel.`;
      } else {
        message.textContent = 'Dein Verzeichnis ist noch leer. Wähle bei einem Film oder einer Serie einen Status aus.';
      }
      emptyState.appendChild(message);

      if (!selectedStatus) {
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
      }

      directoryContainer.appendChild(emptyState);
      return;
    }

    const groups = statusOptions
      .map(status => ({
        ...status,
        items: matchingEntries
          .filter(item => item.status === status.value)
          .sort((a, b) => a.title.localeCompare(b.title, 'de'))
      }))
      .filter(group => group.items.length > 0);

    groups.forEach(group => {
      const section = document.createElement('section');
      section.className = 'status-directory-group';

      const heading = document.createElement('h2');
      heading.className = 'section-title h4';
      heading.textContent = `${group.label} (${group.items.length})`;
      section.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'row row-cols-2 row-cols-md-3 row-cols-lg-5 g-2 g-md-4';
      group.items.forEach(item => row.appendChild(createDirectoryCard(item)));
      section.appendChild(row);
      directoryContainer.appendChild(section);
    });
  }

  function render() {
    renderListControls();
    updateAddButtons();
    updateStatusControls();
    renderWatchlist();
    renderStatusDirectory();
    if (pickerDialog?.open && pendingItem) {
      renderPickerOptions();
      updatePickerState();
    }
  }

  function hasDuplicateName(name, excludedId) {
    const normalizedName = name.toLocaleLowerCase();
    return state.lists.some(list =>
      list.id !== excludedId && list.name.toLocaleLowerCase() === normalizedName
    );
  }

  createForm?.addEventListener('submit', event => {
    event.preventDefault();
    const nameInput = createForm.elements.namedItem('name');
    const name = String(nameInput.value || '').trim().slice(0, 40);
    if (!name) return;
    if (hasDuplicateName(name)) {
      announcement.textContent = 'Es gibt bereits eine Watchlist mit diesem Namen.';
      return;
    }

    const nextState = copyState();
    const list = { id: createListId(), name, items: [] };
    nextState.lists.push(list);
    nextState.activeListId = list.id;

    if (saveState(nextState)) {
      createForm.reset();
      render();
      announcement.textContent = `Watchlist „${name}“ erstellt.`;
    }
  });

  listSelect?.addEventListener('change', () => {
    if (!state.lists.some(list => list.id === listSelect.value)) return;
    const nextState = copyState();
    nextState.activeListId = listSelect.value;
    if (saveState(nextState)) render();
  });

  renameForm?.addEventListener('submit', event => {
    event.preventDefault();
    const name = String(renameInput.value || '').trim().slice(0, 40);
    if (!name) return;

    const list = activeList();
    if (hasDuplicateName(name, list.id)) {
      announcement.textContent = 'Es gibt bereits eine Watchlist mit diesem Namen.';
      return;
    }

    const nextState = copyState();
    const updatedList = nextState.lists.find(item => item.id === list.id);
    updatedList.name = name;
    if (saveState(nextState)) {
      render();
      announcement.textContent = `Watchlist in „${name}“ umbenannt.`;
    }
  });

  deleteButton?.addEventListener('click', () => {
    const list = activeList();
    const isLastList = state.lists.length === 1;
    const warning = isLastList
      ? `„${list.name}“ und alle ${list.items.length} Einträge löschen? Danach wird eine neue leere „Meine Watchlist“ angelegt.`
      : `„${list.name}“ und alle ${list.items.length} Einträge löschen?`;

    if (!window.confirm(warning)) return;

    const nextState = copyState();
    nextState.lists = nextState.lists.filter(item => item.id !== list.id);

    if (nextState.lists.length === 0) {
      const freshList = { id: createListId(), name: 'Meine Watchlist', items: [] };
      nextState.lists.push(freshList);
      nextState.activeListId = freshList.id;
    } else {
      nextState.activeListId = nextState.lists[0].id;
    }

    if (saveState(nextState)) {
      render();
      announcement.textContent = isLastList
        ? 'Watchlist gelöscht. Eine neue leere Meine Watchlist wurde angelegt.'
        : `Watchlist „${list.name}“ gelöscht.`;
    }
  });

  statusFilter?.addEventListener('change', renderStatusDirectory);

  document.addEventListener('change', event => {
    const select = event.target instanceof HTMLSelectElement &&
      event.target.matches('[data-status-select]')
      ? event.target
      : null;
    if (!select) return;

    const item = normalizeItem({
      id: select.dataset.id,
      type: select.dataset.type,
      title: select.dataset.title,
      year: select.dataset.year,
      posterPath: select.dataset.posterPath
    });
    if (!item) return;

    const nextState = copyState();
    const existingIndex = nextState.statusEntries.findIndex(entry => itemKey(entry) === itemKey(item));

    if (!select.value) {
      if (existingIndex < 0) return;
      nextState.statusEntries.splice(existingIndex, 1);
      announcement.textContent = `Status von „${item.title}“ entfernt.`;
    } else {
      if (!statusOptions.some(status => status.value === select.value)) return;
      const entry = { ...item, status: select.value };
      if (existingIndex >= 0) nextState.statusEntries[existingIndex] = entry;
      else nextState.statusEntries.push(entry);

      const statusLabel = statusOptions.find(status => status.value === select.value).label;
      announcement.textContent = `„${item.title}“: ${statusLabel}.`;
    }

    if (saveState(nextState)) render();
    else updateStatusControls();
  });

  pickerSelect?.addEventListener('change', updatePickerState);

  pickerAddButton?.addEventListener('click', () => {
    if (!pendingItem || !pickerSelect) return;

    const nextState = copyState();
    const list = nextState.lists.find(item => item.id === pickerSelect.value);
    if (!list || list.items.some(item => itemKey(item) === itemKey(pendingItem))) return;

    list.items.push(pendingItem);
    nextState.activeListId = list.id;
    if (saveState(nextState)) {
      announcement.textContent = `Zu „${list.name}“ hinzugefügt.`;
      render();
      pickerDialog.close();
    }
  });

  pickerRemoveButton?.addEventListener('click', () => {
    if (!pendingItem || !pickerSelect) return;

    const nextState = copyState();
    const list = nextState.lists.find(item => item.id === pickerSelect.value);
    if (!list) return;

    const itemIndex = list.items.findIndex(item => itemKey(item) === itemKey(pendingItem));
    if (itemIndex < 0) return;

    list.items.splice(itemIndex, 1);
    nextState.activeListId = list.id;
    if (saveState(nextState)) {
      announcement.textContent = `Aus „${list.name}“ entfernt.`;
      render();
      pickerDialog.close();
    }
  });

  pickerCloseButton?.addEventListener('click', () => pickerDialog.close());
  pickerDialog?.addEventListener('close', () => {
    pendingItem = null;
  });

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const addButton = target?.closest('[data-watchlist-add]');
    if (addButton) {
      const item = normalizeItem({
        id: addButton.dataset.id,
        type: addButton.dataset.type,
        title: addButton.dataset.title,
        year: addButton.dataset.year,
        posterPath: addButton.dataset.posterPath
      });
      if (item) openPicker(item);
      return;
    }

    const button = target?.closest('[data-watchlist-remove]');
    if (!button) return;

    const type = button.dataset.type;
    const id = String(button.dataset.id || '');
    if (!['movie', 'tv'].includes(type) || !/^[1-9]\d*$/.test(id)) return;

    const nextState = copyState();
    const list = nextState.lists.find(item => item.id === nextState.activeListId);
    const existingIndex = list.items.findIndex(item => itemKey(item) === `${type}:${id}`);

    if (existingIndex < 0) return;
    list.items.splice(existingIndex, 1);
    announcement.textContent = `Eintrag aus „${list.name}“ entfernt.`;

    if (saveState(nextState)) render();
  });

  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;

    try {
      state = event.newValue
        ? normalizeState(JSON.parse(event.newValue))
        : createDefaultState();
    } catch {
      state = createDefaultState();
    }
    render();
  });

  render();
})();
