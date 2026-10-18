(() => {
  const modal = document.querySelector('.detail-photo-modal');
  const triggers = [...document.querySelectorAll('[data-detail-photo]')];
  const photos = [...new Map(triggers.map(button => [button.dataset.detailPhoto, { src: button.dataset.detailPhoto, caption: button.dataset.caption }])).values()];
  let current = 0;
  let trigger;
  let previousOverflow;
  const show = index => {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    const image = modal.querySelector('figure img');
    image.src = photo.src;
    image.alt = photo.caption;
    modal.querySelector('figcaption').textContent = photo.caption;
    modal.querySelector('[data-detail-position]').textContent = `${current + 1} / ${photos.length}`;
  };
  triggers.forEach(button => button.addEventListener('click', () => {
    trigger = button;
    show(photos.findIndex(photo => photo.src === button.dataset.detailPhoto));
    previousOverflow = document.documentElement.style.overflow;
    modal.showModal();
    document.documentElement.style.overflow = 'hidden';
  }));
  modal.querySelector('.detail-photo-close').addEventListener('click', () => modal.close());
  modal.querySelector('.detail-photo-prev').addEventListener('click', () => show(current - 1));
  modal.querySelector('.detail-photo-next').addEventListener('click', () => show(current + 1));
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
  const url = document.querySelector('link[rel="canonical"]').href;
  const title = document.querySelector('.detail-article h1').textContent;
  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`
  };
  document.querySelectorAll('[data-detail-share]').forEach(link => { link.href = links[link.dataset.detailShare]; });
})();
