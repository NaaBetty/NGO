(() => {
  document.querySelectorAll('footer .social-links').forEach(links => {
    if (links.querySelector('a[aria-label="TikTok"],a[href*="tiktok.com"]')) return;
    const tiktok = document.createElement('a');
    tiktok.href = 'https://www.tiktok.com/@leshelterfoundation';
    tiktok.target = '_blank';
    tiktok.rel = 'noopener noreferrer';
    tiktok.setAttribute('aria-label', 'TikTok');
    const facebook = links.querySelector('a[aria-label="Facebook"]');
    links.insertBefore(tiktok, facebook ? facebook.nextSibling : null);
  });
  if (!document.querySelector('.whatsapp-float')) {
    const chat = document.createElement('a');
    chat.className = 'whatsapp-float';
    chat.href = 'https://wa.me/233530449325?text=Hello%20Le%20Shelter%20Foundation';
    chat.target = '_blank';
    chat.rel = 'noopener noreferrer';
    chat.setAttribute('aria-label', 'Chat with Le Shelter Foundation on WhatsApp (opens in a new tab)');
    chat.innerHTML = '<span class="whatsapp-float-icon" aria-hidden="true"><i class="fa-brands fa-whatsapp"></i></span><span class="whatsapp-callout">Chat with us</span>';
    document.body.append(chat);
  }
  const trigger = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (trigger && menu) {
    trigger.setAttribute('aria-controls', 'mobile-menu');
    const sync = () => {
      const open = !menu.classList.contains('hidden');
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
    new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['class'] });
    if (document.body.classList.contains('home-redesign')) {
      trigger.addEventListener('click', () => menu.classList.toggle('hidden'));
      document.getElementById('close-menu')?.addEventListener('click', () => { menu.classList.add('hidden'); trigger.focus(); });
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        trigger.focus();
      }
    });
    sync();
  }
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  const supportBanner = document.querySelector('.reference-support');
  const footer = document.querySelector('.reference-footer');
  if (supportBanner && footer) {
    const updateFooterHeight = () => {
      supportBanner.style.setProperty('--footer-height', `${footer.getBoundingClientRect().height}px`);
    };
    new ResizeObserver(updateFooterHeight).observe(footer);
    updateFooterHeight();
  }
  const flyerModal = document.getElementById('flyer-modal');
  const flyerTrigger = document.querySelector('[data-open-flyer]');
  if (flyerModal && flyerTrigger) {
    let previousOverflow;
    flyerTrigger.addEventListener('click', () => {
      if (flyerModal.open) return;
      previousOverflow = document.documentElement.style.overflow;
      flyerModal.showModal();
      document.documentElement.style.overflow = 'hidden';
    });
    flyerModal.querySelector('[data-close-flyer]').addEventListener('click', () => flyerModal.close());
    flyerModal.addEventListener('click', event => {
      if (event.target === flyerModal) flyerModal.close();
    });
    flyerModal.addEventListener('close', () => {
      document.documentElement.style.overflow = previousOverflow;
      flyerTrigger.focus({ preventScroll: true });
    });
  }
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stats = document.querySelector('.reference-stats');
  if (stats) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (motionPreference.matches) return;
      const start = performance.now();
      const counters = [...stats.querySelectorAll('[data-count]')];
      const tick = now => {
        const progress = Math.min((now - start) / 1600, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        counters.forEach(counter => {
          counter.textContent = `${Math.round(Number(counter.dataset.count) * eased)}+`;
        });
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(stats);
  }
  const collage = document.querySelector('.about-collage');
  if (collage) {
    const photos = [
      ['images/gallery/s2.jpg', 'Le Shelter volunteers supporting children with learning materials'],
      ['images/gallery/s3.jpg', 'Le Shelter Foundation school outreach in Ghana'],
      ['images/gallery/s1.jpg', 'Children and volunteers celebrating with school supplies'],
      ['images/gallery/s4.jpg', 'Mentorship and conversation during community outreach'],
      ['images/gallery/image43.webp', 'Children taking part in educational activities']
    ];
    const frames = [...collage.querySelectorAll('img')];
    const loaded = photos.map(([src]) => { const photo = new Image(); photo.src = src; return photo; });
    let index = 0;
    let visible = false;
    let timer;
    const advance = () => {
      index = (index + 1) % photos.length;
      frames.forEach((frame, offset) => {
        const next = (index + offset) % photos.length;
        if (!loaded[next].complete || !loaded[next].naturalWidth) return;
        frame.src = photos[next][0];
        frame.alt = photos[next][1];
        if (!motionPreference.matches) frame.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
      });
    };
    const scheduleCollage = () => {
      clearInterval(timer);
      if (visible && !document.hidden && !motionPreference.matches) timer = setInterval(advance, 3500);
    };
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      scheduleCollage();
    }).observe(collage);
    document.addEventListener('visibilitychange', scheduleCollage);
    motionPreference.addEventListener('change', scheduleCollage);
  }
  const storyTrack = document.getElementById('community-stories');
  if (storyTrack) {
    const scrollStories = direction => {
      const card = storyTrack.querySelector('.event-card');
      const distance = card.getBoundingClientRect().width + parseFloat(getComputedStyle(storyTrack).gap);
      const maxScroll = storyTrack.scrollWidth - storyTrack.clientWidth;
      let destination = storyTrack.scrollLeft + direction * distance;
      if (direction > 0 && storyTrack.scrollLeft >= maxScroll - 2) destination = 0;
      if (direction < 0 && storyTrack.scrollLeft <= 2) destination = maxScroll;
      storyTrack.scrollTo({ left: destination, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    document.querySelector('[data-story-prev]')?.addEventListener('click', () => scrollStories(-1));
    document.querySelector('[data-story-next]')?.addEventListener('click', () => scrollStories(1));
  }
  const carousel = document.querySelector('.hero-carousel');
  if (carousel) {
    const header = document.querySelector('.site-header');
    if (header) {
      const updateHeaderHeight = () => {
        carousel.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
      };
      new ResizeObserver(updateHeaderHeight).observe(header);
      updateHeaderHeight();
    }
    const slides = [...carousel.querySelectorAll('.hero-slide')];
    const dots = [...carousel.querySelectorAll('[data-hero-slide]')];
    const controls = carousel.querySelector('.hero-controls');
    const pause = carousel.querySelector('[data-hero-pause]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const caption = carousel.querySelector('.opening-copy');
    const heading = carousel.querySelector('.opening-copy h1');
    const intro = carousel.querySelector('.opening-copy .intro');
    const captions = [
      ['A little support.', 'A lifetime of', 'possibility.', 'Every child deserves the chance to learn, dream and thrive. We help children in rural Ghana find that chance, one school and one community at a time.'],
      ['The tools to learn.', 'The chance to', 'thrive.', 'Books, uniforms and learning materials help children take part in school and take the next step towards their dreams.'],
      ['Guidance today.', 'Confidence for', 'tomorrow.', 'Through mentorship and encouragement, we help young learners discover their strengths and imagine what their futures could hold.'],
      ['Stronger together.', 'Possibility for', 'every child.', 'With volunteers and local communities, we support learning environments where children feel valued, encouraged and ready to grow.']
    ];
    let current = 0;
    let paused = reducedMotion.matches;
    let timer;
    const show = index => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; });
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
      if (heading && intro) {
        const [first, second, emphasis, description] = captions[current];
        const em = document.createElement('em');
        em.textContent = emphasis;
        heading.replaceChildren(first, document.createElement('br'), second, document.createElement('br'), em);
        intro.textContent = description;
      }
    };
    const schedule = () => {
      clearInterval(timer);
      pause.textContent = paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      carousel.querySelector('.hero-slides').setAttribute('aria-live', paused ? 'polite' : 'off');
      if (!paused && !document.hidden && !caption?.matches(':hover') && !carousel.contains(document.activeElement)) {
        timer = setInterval(() => show(current + 1), window.LE_SHELTER_CONTENT?.timing?.hero || 4500);
      }
    };
    const navigate = index => { show(index); schedule(); };
    carousel.querySelector('[data-hero-prev]')?.addEventListener('click', () => navigate(current - 1));
    carousel.querySelector('[data-hero-next]')?.addEventListener('click', () => navigate(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => navigate(i)));
    pause.addEventListener('click', () => { paused = !paused; schedule(); });
    caption?.addEventListener('mouseenter', schedule);
    caption?.addEventListener('mouseleave', schedule);
    carousel.addEventListener('focusin', schedule);
    carousel.addEventListener('focusout', () => setTimeout(schedule, 0));
    carousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; schedule(); });
    controls.hidden = false;
    show(0);
    schedule();
  }
})();
