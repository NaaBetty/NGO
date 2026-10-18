(() => {
  const clientTrack = document.querySelector('[data-client-track]');
  if (clientTrack) {
    const slider = clientTrack.closest('.client-slider');
    const cards = [...clientTrack.children];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer;
    let visible = false;
    const advance = direction => {
      const step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(clientTrack).gap);
      const max = clientTrack.scrollWidth - clientTrack.clientWidth;
      let left = clientTrack.scrollLeft + step * direction;
      if (direction > 0 && clientTrack.scrollLeft >= max - 2) left = 0;
      if (direction < 0 && clientTrack.scrollLeft <= 2) left = max;
      clientTrack.scrollTo({ left, behavior: motion.matches ? 'instant' : 'smooth' });
    };
    const schedule = () => {
      clearInterval(timer);
      if (visible && !motion.matches && !document.hidden && !slider.contains(document.activeElement)) timer = setInterval(() => advance(1), 4000);
    };
    slider.querySelector('[data-client-prev]').addEventListener('click', () => { advance(-1); schedule(); });
    slider.querySelector('[data-client-next]').addEventListener('click', () => { advance(1); schedule(); });
    slider.addEventListener('focusin', schedule);
    slider.addEventListener('focusout', () => setTimeout(schedule, 0));
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(slider);
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', schedule);
  }
  const countdown = document.querySelector('[data-event-start]');
  if (countdown) {
    const managedEvent = window.LE_SHELTER_CONTENT?.event;
    const start = Date.parse(managedEvent?.start || countdown.dataset.eventStart);
    const end = Date.parse(managedEvent?.end || countdown.dataset.eventEnd);
    const status = document.querySelector('[data-event-status]');
    const update = () => {
      const now = Date.now();
      const seconds = Math.max(0, Math.floor((start - now) / 1000));
      const values = { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
      Object.entries(values).forEach(([unit, value]) => {
        countdown.querySelector(`[data-event-${unit}]`).textContent = String(value).padStart(2, '0');
      });
      status.textContent = now >= end ? 'Event ended' : now >= start ? 'Event underway' : 'Counting down to the event';
      countdown.setAttribute('aria-label', now >= end ? 'Event ended' : now >= start ? 'Event underway' : 'Time until the event starts');
    };
    update();
    if (Date.now() < end) setInterval(update, 1000);
    const eventUrl = 'https://www.leshelterfoundation.org/projects.html#featured-project';
    const title = 'Le Shelter Foundation — Annual School Supplies Drive & Mentorship Day';
    const url = encodeURIComponent(eventUrl);
    const text = encodeURIComponent(`${title}\nSeptember 18–21, 2026 · Anyirawase D/A JHS, Volta Region, Ghana\n${eventUrl}`);
    const shares = {
      whatsapp: `https://wa.me/?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${encodeURIComponent(title)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${text}`
    };
    document.querySelectorAll('[data-event-share]').forEach(link => { link.href = shares[link.dataset.eventShare]; });
    document.querySelector('[data-event-copy]').addEventListener('click', async () => {
      const message = document.querySelector('[data-event-copy-status]');
      try {
        await navigator.clipboard.writeText(eventUrl);
        message.textContent = 'Link copied';
      } catch {
        message.textContent = `Copy this link: ${eventUrl}`;
      }
    });
  }
  const buttons = [...document.querySelectorAll('[data-project-filter]')];
  const stories = [...document.querySelectorAll('[data-project-category]')];
  const pages = document.querySelector('[data-project-pages]');
  const range = document.querySelector('[data-project-range]');
  const pageSize = 4;
  let category = 'all';
  let page = 1;
  const renderProjects = () => {
    const filtered = stories.filter(story => category === 'all' || story.dataset.projectCategory === category);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(Math.max(1, page), totalPages);
    const start = (page - 1) * pageSize;
    const visible = new Set(filtered.slice(start, start + pageSize));
    stories.forEach(story => { story.hidden = !visible.has(story); });
    buttons.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.projectFilter === category)));
    const first = filtered.length ? start + 1 : 0;
    const last = Math.min(start + pageSize, filtered.length);
    const label = `${first}–${last} of ${filtered.length} items`;
    range.textContent = label;
    pages.replaceChildren();
    const addButton = (text, destination, ariaLabel, disabled = false, current = false) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.dataset.projectPage = destination;
      button.setAttribute('aria-label', ariaLabel);
      button.disabled = disabled;
      if (current) button.setAttribute('aria-current', 'page');
      pages.append(button);
    };
    addButton('‹', page - 1, 'Previous project page', page === 1);
    for (let number = 1; number <= totalPages; number++) addButton(String(number), number, `Project page ${number}`, false, number === page);
    addButton('›', page + 1, 'Next project page', page === totalPages);
  };
  pages.addEventListener('click', event => {
    const button = event.target.closest('[data-project-page]');
    if (!button || button.disabled) return;
    page = Number(button.dataset.projectPage);
    renderProjects();
    pages.querySelector('[aria-current="page"]').focus({ preventScroll: true });
  });
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      category = button.dataset.projectFilter;
      page = 1;
      renderProjects();
    });
  });
  renderProjects();
})();
