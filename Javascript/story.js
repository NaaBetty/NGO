(() => {
  const values = document.querySelector('.story-values');
  if (values) {
    const track = values.querySelector('.values-slider-track');
    const originals = [...track.children];
    originals.forEach(tile => {
      const clone = tile.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('inert', '');
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
    const pause = values.querySelector('[data-values-pause]');
    pause.addEventListener('click', () => {
      const paused = values.classList.toggle('is-paused');
      pause.textContent = paused ? 'Play slider' : 'Pause slider';
      pause.setAttribute('aria-label', paused ? 'Play thumbnail slider' : 'Pause thumbnail slider');
    });
  }
  const carousel = document.querySelector('.testimonial-carousel');
  if (!carousel) return;
  const quotes = [...carousel.querySelectorAll('.volunteer-quote')];
  const count = carousel.querySelector('[data-quote-count]');
  const pauseButton = carousel.querySelector('[data-quote-pause]');
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
    });
    count.textContent = `${current + 1} / ${quotes.length}`;
    requestAnimationFrame(sizeQuoteArea);
  };
  const schedule = () => {
    clearInterval(timer);
    pauseButton.textContent = paused ? 'Play' : 'Pause';
    pauseButton.setAttribute('aria-label', paused ? 'Play volunteer stories' : 'Pause volunteer stories');
    carousel.querySelector('.testimonial-quotes').setAttribute('aria-live', paused ? 'polite' : 'off');
    if (!paused && !document.hidden && !carousel.matches(':hover') && !carousel.contains(document.activeElement)) {
      timer = setInterval(() => show(current + 1), 4000);
    }
  };
  const navigate = index => { show(index); schedule(); };
  carousel.querySelector('[data-quote-prev]').addEventListener('click', () => navigate(current - 1));
  carousel.querySelector('[data-quote-next]').addEventListener('click', () => navigate(current + 1));
  pauseButton.addEventListener('click', () => { paused = !paused; schedule(); });
  carousel.addEventListener('mouseenter', schedule);
  carousel.addEventListener('mouseleave', schedule);
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
