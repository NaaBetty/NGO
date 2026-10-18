(() => {
  document.querySelectorAll('[data-product-photo]').forEach(image => {
    const show = () => { image.hidden = !image.naturalWidth; };
    image.addEventListener('load', show);
    image.addEventListener('error', () => { image.hidden = true; });
    if (image.complete) show();
  });
  document.querySelectorAll('.color-swatch, .size-swatch').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
    button.addEventListener('click', () => {
      const selector = button.classList.contains('color-swatch') ? '.color-swatch' : '.size-swatch';
      button.closest('.product-card').querySelectorAll(selector).forEach(option => {
        option.setAttribute('aria-pressed', String(option === button));
      });
    });
  });
  document.querySelectorAll('.category-btn').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    button.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    });
  });
  const modal = document.getElementById('checkout-modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Checkout details');
  const close = document.getElementById('checkout-modal-close');
  close.setAttribute('aria-label', 'Close checkout');
  const checkout = document.getElementById('checkout-btn');
  new MutationObserver(() => {
    if (!modal.classList.contains('hidden')) document.getElementById('checkout-name').focus();
    else checkout.focus({ preventScroll: true });
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', event => {
    if (modal.classList.contains('hidden')) return;
    if (event.key === 'Escape') close.click();
    if (event.key === 'Tab') {
      const elements = [...modal.querySelectorAll('button, input, a[href]')].filter(el => !el.disabled);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
