(() => {
  const finalFeature = document.querySelector('.story-project-feature');
  const footer = document.querySelector('.reference-footer');
  if (finalFeature && footer) {
    const fitFinalScreen = () => finalFeature.style.setProperty('--story-footer-height', `${footer.getBoundingClientRect().height}px`);
    new ResizeObserver(fitFinalScreen).observe(footer);
    fitFinalScreen();
  }
  if (finalFeature) {
    // Also remove the link when an editor preview supplies older HTML.
    const linkedStory = finalFeature.querySelector('a.featured-story');
    if (linkedStory) {
      const story = document.createElement('div');
      story.className = 'featured-story';
      story.append(...linkedStory.childNodes);
      linkedStory.replaceWith(story);
    }
    const image = finalFeature.querySelector('.story-image img');
    const photos = [
      ['images/gallery/image15.webp', 'Students supported through Le Shelter educational outreach'],
      ['images/gallery/s1.jpg', 'Children and volunteers celebrating together'],
      ['images/gallery/s2.jpg', 'Le Shelter school supply outreach'],
      ['images/gallery/s3.jpg', 'Volunteers visiting a school community'],
      ['images/gallery/s4.jpg', 'Le Shelter community mentorship and engagement']
    ];
    const loaded = photos.map(([src]) => { const photo = new Image(); photo.src = src; return photo; });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0;
    let visible = false;
    let timer;
    const advance = () => {
      const next = (index + 1) % photos.length;
      if (!loaded[next].complete || !loaded[next].naturalWidth) return;
      index = next;
      image.src = photos[index][0];
      image.alt = photos[index][1];
      image.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 550, easing: 'ease-out' });
    };
    const schedule = () => {
      clearInterval(timer);
      if (visible && !document.hidden && !motion.matches) timer = setInterval(advance, window.LE_SHELTER_CONTENT?.timing?.circles || 3500);
    };
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(finalFeature);
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', schedule);
  }
  const intro = document.querySelector('.story-intro');
  if (intro) {
    const circles = [...intro.querySelectorAll('.story-small-photo, .story-round-photo')];
    const photos = [
      ['images/gallery/s4.jpg', 'Le Shelter volunteers sharing guidance with students'],
      ['images/gallery/s2.jpg', 'Volunteers supporting students with educational supplies'],
      ['images/gallery/s1.jpg', 'Children and volunteers celebrating together']
    ];
    const loaded = photos.map(([src]) => { const image = new Image(); image.src = src; return image; });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activeCircle = 0;
    const photoIndices = circles.map((_, i) => i % photos.length);
    let visible = false;
    let timer;
    const advance = () => {
      if (!loaded.every(image => image.complete && image.naturalWidth)) return;
      const circle = circles[activeCircle];
      photoIndices[activeCircle] = (photoIndices[activeCircle] + 1) % photos.length;
      const photo = photos[photoIndices[activeCircle]];
      circle.src = photo[0];
      circle.alt = photo[1];
      circle.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' });
      activeCircle = (activeCircle + 1) % circles.length;
    };
    const schedule = () => {
      clearInterval(timer);
      if (visible && !document.hidden && !motion.matches) timer = setInterval(advance, window.LE_SHELTER_CONTENT?.timing?.circles || 3500);
    };
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(intro);
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', schedule);
  }
  // Upgrade older editor previews to the same side-by-side mission and vision layout.
  const purpose = document.querySelector('.story-purpose');
  if (purpose?.querySelector('[role="tablist"]')) {
    const layout = purpose.querySelector('.purpose-layout');
    const columns = ['mission', 'vision'].map(key => {
      const panel = purpose.querySelector(`#${key}-panel`);
      const column = document.createElement('article');
      column.className = 'purpose-column';
      const heading = document.createElement('h2');
      heading.className = 'purpose-column-label';
      heading.id = `${key}-heading`;
      const label = document.createElement('span');
      label.textContent = key === 'mission' ? 'Our mission' : 'Our vision';
      heading.append(label);
      column.setAttribute('aria-labelledby', heading.id);
      column.append(heading, ...panel.childNodes);
      return column;
    });
    layout.replaceChildren(...columns);
    layout.classList.add('purpose-columns');
    purpose.removeAttribute('aria-labelledby');
    purpose.setAttribute('aria-label', 'Our mission and vision');
  }
  const stats = document.querySelector('.story-stats');
  if (stats) {
    const counters = [...stats.querySelectorAll('[data-story-count]')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (motion.matches) return;
      const start = performance.now();
      const tick = now => {
        const progress = Math.min((now - start) / 1600, 1);
        const eased = 1 - (1 - progress) ** 3;
        counters.forEach(counter => {
          counter.textContent = `${Math.round(Number(counter.dataset.storyCount) * eased)}${counter.dataset.suffix}`;
        });
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(stats);
  }
  const values = document.querySelector('.story-values');
  if (values) {
    const track = values.querySelector('.values-slider-track');
    const originals = [...track.children];
    originals.forEach(tile => {
      const clone = tile.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('data-loop-clone', '');
      clone.tabIndex = -1;
      track.append(clone);
    });
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).gap);
      const distance = originals.reduce((total, tile) => total + tile.offsetWidth + gap, 0);
      track.style.setProperty('--loop-distance', `${distance}px`);
      track.style.setProperty('--loop-duration', `${distance / 35}s`);
      track.classList.add('is-ready');
    };
    new ResizeObserver(measure).observe(values);
    measure();

  }
  const carousel = document.querySelector('.testimonial-carousel');
  if (!carousel) return;
  const quotes = [...carousel.querySelectorAll('.volunteer-quote')];
  if (!quotes.length) return;
  const photoModal = document.querySelector('.testimonial-photo-modal');
  let photoTrigger;
  let previousOverflow;
  let modalPhotos = [];
  let modalPhotoIndex = 0;
  const showModalPhoto = index => {
    modalPhotoIndex = (index + modalPhotos.length) % modalPhotos.length;
    const button = modalPhotos[modalPhotoIndex];
    const image = photoModal.querySelector('img');
    image.src = button.dataset.testimonialPhoto;
    image.alt = button.querySelector('img').alt;
  };
  carousel.querySelectorAll('[data-testimonial-photo]').forEach(button => {
    button.addEventListener('click', () => {
      if (!photoModal) return;
      photoTrigger = button;
      modalPhotos = [...button.closest('.quote-gallery').querySelectorAll('[data-testimonial-photo]')];
      showModalPhoto(modalPhotos.indexOf(button));
      previousOverflow = document.documentElement.style.overflow;
      photoModal.showModal();
      document.documentElement.style.overflow = 'hidden';
      schedule();
    });
  });
  photoModal?.querySelector('.testimonial-photo-close')?.addEventListener('click', () => photoModal.close());
  photoModal?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showModalPhoto(modalPhotoIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  photoModal?.addEventListener('click', event => { if (event.target === photoModal) photoModal.close(); });
  photoModal?.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    photoTrigger?.focus({ preventScroll: true });
    schedule();
  });
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let paused = motion.matches;
  let timer;
  const sizeQuoteArea = () => {
    carousel.querySelector('.testimonial-quotes').style.height = `${quotes[current].offsetHeight + 20}px`;
  };
  const quoteObserver = new ResizeObserver(sizeQuoteArea);
  quotes.forEach(quote => quoteObserver.observe(quote));
  const show = index => {
    current = (index + quotes.length) % quotes.length;
    quotes.forEach((quote, i) => {
      const position = (i - current + quotes.length) % quotes.length;
      quote.hidden = false;
      quote.classList.toggle('is-current', position === 0);
      quote.classList.toggle('is-next', position === 1);
      quote.classList.toggle('is-previous', position === quotes.length - 1);
      quote.setAttribute('aria-hidden', String(position !== 0));
      quote.toggleAttribute('inert', position !== 0);
    });
    requestAnimationFrame(sizeQuoteArea);
  };
  const schedule = () => {
    clearInterval(timer);
    carousel.querySelector('.testimonial-quotes').setAttribute('aria-live', paused ? 'polite' : 'off');
    if (!paused && !document.hidden && !photoModal?.open && !quotes[current].matches(':hover') && !carousel.contains(document.activeElement)) {
      timer = setInterval(() => { show(current + 1); schedule(); }, window.LE_SHELTER_CONTENT?.timing?.testimonials || 4000);
    }
  };
  const navigate = index => { show(index); schedule(); };
  carousel.querySelector('[data-quote-prev]').addEventListener('click', () => navigate(current - 1));
  carousel.querySelector('[data-quote-next]').addEventListener('click', () => navigate(current + 1));
  quotes.forEach(quote => {
    quote.addEventListener('mouseenter', () => { if (quote === quotes[current]) schedule(); });
    quote.addEventListener('mouseleave', () => { if (quote === quotes[current]) schedule(); });
  });
  carousel.addEventListener('focusin', schedule);
  carousel.addEventListener('focusout', () => setTimeout(schedule, 0));
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { paused = motion.matches; schedule(); });
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  show(0);
  schedule();
})();
