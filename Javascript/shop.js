(() => {
    // Product catalog — authoritative source of truth for names and prices.
    // Cart storage never persists prices; they are always looked up from here.
    const PRODUCT_CATALOG = {
      tshirt:     { name: 'Organic T-Shirt',    price: 45 },
      tote:       { name: 'Canvas Tote Bag',    price: 35 },
      cap:        { name: 'Branded Cap',        price: 30 },
      notebooks:  { name: 'Notebook Set (3x)',  price: 28 },
      mug:        { name: 'Mission Coffee Mug', price: 25 },
      wristbands: { name: 'Wristband Set (5x)', price: 20 },
      hoodie:     { name: 'Cozy Hoodie',        price: 65 },
      bottle:     { name: 'Eco Water Bottle',   price: 50 },
    };
    for (const product of window.LE_SHELTER_CONTENT?.products || []) {
      if (Number.isFinite(product.price) && product.price >= 0) {
        PRODUCT_CATALOG[product.id] = { name: product.name, price: product.price };
      }
    }

    // Sanitize values before writing to spreadsheet cells (F-04).
    function spreadsheetSafe(value, maxLength = 200) {
      let text = String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, maxLength);
      if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
      return text;
    }

    // Load cart from localStorage, validating every field (F-02).
    function loadCart() {
      try {
        const raw = JSON.parse(localStorage.getItem('shop-cart'));
        if (!Array.isArray(raw)) return [];
        return raw.filter(item =>
          typeof item.productId === 'string' && item.productId in PRODUCT_CATALOG &&
          typeof item.color === 'string' && item.color.length <= 30 &&
          (item.size == null || (typeof item.size === 'string' && item.size.length <= 10)) &&
          Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20
        ).map(item => ({
          id: item.productId + '-' + item.color + (item.size ? '-' + item.size : ''),
          productId: item.productId,
          color: item.color,
          size: item.size || null,
          quantity: item.quantity
        }));
      } catch { return []; }
    }

    // Persist only IDs, variants, and quantities — never names or prices (F-01).
    function saveCart() {
      localStorage.setItem('shop-cart', JSON.stringify(
        cart.map(({ productId, color, size, quantity }) => ({ productId, color, size, quantity }))
      ));
    }

    let cart = loadCart();

    function addToCart(productId, color, size) {
      if (!(productId in PRODUCT_CATALOG)) return;
      const cartId = productId + '-' + color + (size ? '-' + size : '');
      const existing = cart.find(i => i.id === cartId);
      if (existing) {
        if (existing.quantity < 20) existing.quantity += 1;
      } else {
        cart.push({ id: cartId, productId, color, size: size || null, quantity: 1 });
      }
      saveCart();
      updateCartDisplay();
      showAddedNotification(PRODUCT_CATALOG[productId].name);
    }

    function removeFromCart(cartId) {
      cart = cart.filter(i => i.id !== cartId);
      saveCart();
      updateCartDisplay();
    }

    function updateQuantity(cartId, delta) {
      const item = cart.find(i => i.id === cartId);
      if (!item) return;
      const next = item.quantity + delta;
      if (next <= 0) { removeFromCart(cartId); return; }
      item.quantity = Math.min(next, 20);
      saveCart();
      updateCartDisplay();
    }

    // Build cart rows with DOM API — no innerHTML, no string interpolation (F-02).
    function renderCartItem(item) {
      const product = PRODUCT_CATALOG[item.productId];
      if (!product) return null;
      const itemTotal = product.price * item.quantity;

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200';

      const info = document.createElement('div');
      info.className = 'flex-1';
      const nameEl = document.createElement('p');
      nameEl.className = 'font-bold text-lg text-[var(--primary)]';
      nameEl.textContent = product.name;
      const variantEl = document.createElement('p');
      variantEl.className = 'text-gray-600 text-sm';
      variantEl.textContent = (item.color || '') + (item.size ? ' · ' + item.size : '') + ' · GH₵' + product.price.toFixed(2) + ' each';
      info.append(nameEl, variantEl);

      const controls = document.createElement('div');
      controls.className = 'flex items-center gap-2 py-2 rounded-lg';
      const decBtn = document.createElement('button');
      decBtn.type = 'button';
      decBtn.className = 'px-2 py-1 text-lg font-bold text-[var(--primary)] hover:bg-white rounded';
      decBtn.textContent = '−';
      decBtn.addEventListener('click', () => updateQuantity(item.id, -1));
      const qtyEl = document.createElement('span');
      qtyEl.className = 'px-2 font-bold text-2xl text-[var(--primary)]';
      qtyEl.textContent = String(item.quantity);
      const incBtn = document.createElement('button');
      incBtn.type = 'button';
      incBtn.className = 'px-2 py-1 text-lg font-bold text-[var(--primary)] hover:bg-white rounded';
      incBtn.textContent = '+';
      incBtn.addEventListener('click', () => updateQuantity(item.id, 1));
      controls.append(decBtn, qtyEl, incBtn);

      const pricing = document.createElement('div');
      pricing.className = 'flex-1 text-right';
      const totalEl = document.createElement('p');
      totalEl.className = 'font-bold text-lg text-[var(--primary)]';
      totalEl.textContent = 'GH₵' + itemTotal.toFixed(2);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'text-xs text-red-500 hover:text-red-700 font-bold mt-1 block ml-auto';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeFromCart(item.id));
      pricing.append(totalEl, removeBtn);

      row.append(info, controls, pricing);
      return row;
    }

    function updateCartDisplay() {
      const cartItemsDiv = document.getElementById('cart-items');
      const cartSummary = document.getElementById('cart-summary');

      if (cart.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-gray-600 font-bold text-center py-8';
        empty.textContent = 'Your cart is empty. Browse our collection above to add items!';
        cartItemsDiv.replaceChildren(empty);
        cartSummary.classList.add('hidden');
        return;
      }

      cartSummary.classList.remove('hidden');
      cartItemsDiv.replaceChildren(...cart.map(renderCartItem).filter(Boolean));

      let subtotal = 0;
      cart.forEach(item => {
        const product = PRODUCT_CATALOG[item.productId];
        if (product) subtotal += product.price * item.quantity;
      });
      document.getElementById('subtotal').textContent = 'GH₵' + subtotal.toFixed(2);
      document.getElementById('total').textContent = 'GH₵' + subtotal.toFixed(2);
    }

    function showAddedNotification(productName) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-6 right-6 bg-[var(--primary)] text-white px-6 py-4 rounded-xl font-bold shadow-2xl z-50 animate-bounce';
      notification.textContent = '✓ ' + productName + ' added to cart!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2500);
    }

    // Delegate interactions so products added by the CMS work immediately.
    document.addEventListener('click', e => {
      const swatch=e.target.closest('.color-swatch,.size-swatch');
      if(swatch){
        e.preventDefault();const card=swatch.closest('.product-card');
        card.querySelectorAll(swatch.matches('.color-swatch')?'.color-swatch':'.size-swatch').forEach(node=>{node.classList.remove('selected');node.setAttribute('aria-pressed','false');});
        swatch.classList.add('selected');swatch.setAttribute('aria-pressed','true');
        if(swatch.matches('.color-swatch')&&swatch.hasAttribute('data-photo')){
          const image=card.querySelector('[data-product-photo]'),placeholder=card.querySelector('.product-photo-placeholder');
          if(image){
            image.onload=()=>{image.hidden=false;if(placeholder)placeholder.hidden=true;};
            image.onerror=()=>{image.hidden=true;if(placeholder)placeholder.hidden=false;};
            image.hidden=true;if(placeholder)placeholder.hidden=false;
            image.alt=swatch.dataset.photoAlt||swatch.dataset.color;
            if(swatch.dataset.photo){image.src=swatch.dataset.photo;if(image.complete&&image.naturalWidth)image.onload();}else image.removeAttribute('src');
          }
        }
        return;
      }
      const button=e.target.closest('.add-to-cart');
      if(button){
        e.preventDefault();const card=button.closest('.product-card');
        addToCart(button.dataset.product,card.querySelector('.color-swatch.selected')?.dataset.color??'White',card.querySelector('.size-swatch.selected')?.dataset.size??null);return;
      }
      const filter=e.target.closest('.category-btn');
      if(filter){
        e.preventDefault();document.querySelectorAll('.category-btn').forEach(node=>{node.classList.toggle('active',node===filter);node.setAttribute('aria-pressed',String(node===filter));});
        document.querySelectorAll('.product-card').forEach(card=>{
          const category=filter.dataset.category;
          card.style.display=(category==='all'||card.dataset.shopCategory===category||card.classList.contains(category))?'flex':'none';
        });
      }
    });
    window.addEventListener('leshelter-products',event=>{
      for(const id of Object.keys(PRODUCT_CATALOG))delete PRODUCT_CATALOG[id];
      for(const product of event.detail)PRODUCT_CATALOG[product.id]={name:product.name,price:product.price};
      cart=cart.filter(item=>Object.hasOwn(PRODUCT_CATALOG,item.productId));saveCart();updateCartDisplay();
    });

    // Clear Cart Button
    document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
      if (cart.length === 0) { alert('Your cart is already empty!'); return; }
      if (confirm('Are you sure you want to remove ALL items from your cart? This cannot be undone.')) {
        cart = [];
        localStorage.removeItem('shop-cart');
        updateCartDisplay();
      }
    });

    // Checkout Button — open modal
    document.getElementById('checkout-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('checkout-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    });

    function closeCheckoutModal() {
      const modal = document.getElementById('checkout-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.style.overflow = '';
    }

    document.getElementById('checkout-modal-close')?.addEventListener('click', closeCheckoutModal);
    document.getElementById('checkout-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'checkout-modal') closeCheckoutModal();
    });

    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbx9ezmcIaWcBf6mQAFycFu89JtRGOKq16ymYIN7Z94LJmJQJ3s66xHouWgvlfQLczF-/exec';

    document.getElementById('checkout-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      const name = document.getElementById('checkout-name').value.trim();
      const destination = document.getElementById('checkout-destination').value.trim();
      const phone = document.getElementById('checkout-phone').value.trim().replace(/\s+/g, '');
      const phoneError = document.getElementById('phone-error');

      if (!/^\d{10,15}$/.test(phone)) {
        phoneError.classList.remove('hidden');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      phoneError.classList.add('hidden');

      // Build rows from catalog prices — never from stored or submitted values (F-01, F-04)
      const orderDate = new Date().toLocaleString();
      const rows = cart.map(item => {
        const product = PRODUCT_CATALOG[item.productId];
        return {
          date: spreadsheetSafe(orderDate, 50),
          name: spreadsheetSafe(name, 100),
          destination: spreadsheetSafe(destination, 150),
          phone: spreadsheetSafe(phone, 20),
          item: spreadsheetSafe(
            product.name +
            (item.color ? ' (' + item.color + ')' : '') +
            (item.size ? ' [' + item.size + ']' : ''),
            200
          ),
          quantity: item.quantity,
          total: spreadsheetSafe('GH\u20b5' + (product.price * item.quantity).toFixed(2), 30)
        };
      });

      fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })
      .then(() => {
        // no-cors responses are opaque — HTTP errors cannot be detected here.
        // A server-side API endpoint is required for reliable order confirmation.
        alert('Order submitted! We will contact you on the number provided to confirm. Please keep a note of your items in case confirmation is delayed.');
        cart = [];
        localStorage.removeItem('shop-cart');
        updateCartDisplay();
        closeCheckoutModal();
        e.target.reset();
      })
      .catch(() => {
        alert('There was an error placing your order. Please try again or contact us directly at lesheltergh@gmail.com.');
      })
      .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
    });

    updateCartDisplay();
  
})();
