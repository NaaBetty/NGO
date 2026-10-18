(() => {
  const tiles = [...document.querySelectorAll('[data-gallery-photo]')];
  const more = document.querySelector('[data-gallery-more]');
  const status = document.querySelector('[data-gallery-status]');
  const modal = document.getElementById('gallery-viewer');
  let photos = [];
  let current = 0;
  let trigger;
  let previousOverflow;
  let category = 'all';
  let limit = 12;
  const filters = [...document.querySelectorAll('[data-gallery-filter]')];
  const matching = () => tiles.filter(tile => category === 'all' || tile.dataset.galleryCategory === category);
  const updateLoadStatus = () => {
    const count = tiles.filter(tile => !tile.hidden).length;
    const total = matching().length;
    status.textContent = `Showing ${count} of ${total} photos`;
    more.hidden = count === total;
  };
  const applyFilter = () => {
    const visible = new Set(matching().slice(0, limit));
    tiles.forEach(tile => { tile.hidden = !visible.has(tile); });
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.galleryFilter === category)));
    updateLoadStatus();
  };
  filters.forEach(filter => filter.addEventListener('click', () => {
    category = filter.dataset.galleryFilter;
    limit = 12;
    applyFilter();
  }));
  more.addEventListener('click', () => {
    const next = matching().filter(tile => tile.hidden).slice(0, 12);
    limit += 12;
    applyFilter();
    next[0]?.focus({ preventScroll: true });
  });
  const show = index => {
    current = (index + photos.length) % photos.length;
    const source = photos[current].querySelector('img');
    const image = modal.querySelector('figure img');
    image.src = source.src;
    image.alt = source.alt;
    modal.querySelector('[data-gallery-caption]').textContent = source.alt;
    modal.querySelector('[data-gallery-position]').textContent = `${current + 1} / ${photos.length}`;
  };
  tiles.forEach(tile => tile.addEventListener('click', () => {
    trigger = tile;
    photos = tiles.filter(photo => !photo.hidden);
    show(photos.indexOf(tile));
    previousOverflow = document.documentElement.style.overflow;
    modal.showModal();
    document.documentElement.style.overflow = 'hidden';
  }));
  modal.querySelector('[data-gallery-close]').addEventListener('click', () => modal.close());
  modal.querySelector('[data-gallery-prev]').addEventListener('click', () => show(current - 1));
  modal.querySelector('[data-gallery-next]').addEventListener('click', () => show(current + 1));
  modal.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  modal.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    trigger?.focus({ preventScroll: true });
  });
  applyFilter();
})();
