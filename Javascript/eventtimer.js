  // Event date in UTC (April 15, 2026 at 14:00 GMT / Africa/Accra time)
  const eventDate = new Date(Date.UTC(2026, 3, 15, 14, 0, 0)); // Month is 0-based (3 = April)

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = eventDate.getTime() - now;

    if (distance < 0) {
      document.getElementById('countdown').innerHTML = 
        '<p class="text-3xl md:text-4xl font-bold text-[var(--primary)]">The event is happening now!</p>';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
  }

  // Run immediately and every second
  updateCountdown();
  setInterval(updateCountdown, 1000);
