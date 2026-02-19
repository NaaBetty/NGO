document.querySelectorAll('.start-counter').forEach(counter => {
  let started = false;
  function animateCounter() {
    if (started) return;
    started = true;
    const target = parseInt(counter.dataset.to, 10);
    const speed = parseInt(counter.dataset.speed, 10);
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / (speed / 16)));
    function update() {
      current += increment;
      if (current >= target) {
        counter.textContent = target;
      } else {
        counter.textContent = current;
        requestAnimationFrame(update);
      }
    }
    update();
  }
  // Optional: Start when in viewport (for performance)
  function onScroll() {
    const rect = counter.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      animateCounter();
      window.removeEventListener('scroll', onScroll);
    }
  }
  window.addEventListener('scroll', onScroll);
  // For immediately visible counters:
  onScroll();
});

// Hero Slider Only (cleaned – no unused carousel code)
  let heroCurrentSlide = 0;
  const heroSliderWrapper = document.getElementById('hero-slider-wrapper');
  const heroPrevBtn = document.getElementById('hero-prev');
  const heroNextBtn = document.getElementById('hero-next');
  const heroDots = document.querySelectorAll('.hero-dot');
  const heroTotalSlides = document.querySelectorAll('.hero-slide').length;
  let heroAutoPlay;

  function updateHeroSlider() {
    heroSliderWrapper.style.transform = `translateX(-${heroCurrentSlide * 100}%)`;

    heroDots.forEach((dot, i) => {
      dot.classList.toggle('bg-white', i === heroCurrentSlide);
      dot.classList.toggle('bg-white/50', i !== heroCurrentSlide);
    });
  }

  function nextHeroSlide() {
    heroCurrentSlide = (heroCurrentSlide + 1) % heroTotalSlides;
    updateHeroSlider();
  }

  heroPrevBtn.addEventListener('click', () => {
    heroCurrentSlide = heroCurrentSlide > 0 ? heroCurrentSlide - 1 : heroTotalSlides - 1;
    updateHeroSlider();
    resetHeroAutoPlay();
  });

  heroNextBtn.addEventListener('click', () => {
    nextHeroSlide();
    resetHeroAutoPlay();
  });

  heroDots.forEach(dot => {
    dot.addEventListener('click', () => {
      heroCurrentSlide = parseInt(dot.dataset.slide);
      updateHeroSlider();
      resetHeroAutoPlay();
    });
  });

  function startHeroAutoPlay() {
    heroAutoPlay = setInterval(nextHeroSlide, 6000);
  }

  function resetHeroAutoPlay() {
    clearInterval(heroAutoPlay);
    startHeroAutoPlay();
  }

  // Pause on hover
  const heroSection = document.querySelector('section.relative.h-96');
  heroSection.addEventListener('mouseenter', () => clearInterval(heroAutoPlay));
  heroSection.addEventListener('mouseleave', startHeroAutoPlay);

  // Start
  updateHeroSlider();
  startHeroAutoPlay();