// Natural — demo storefront
// Carrito en localStorage, checkout abre WhatsApp con mensaje prefilled.
// Microinteracciones: reveal on scroll, sticky header con elevación.

const WHATSAPP_NUMBER = '5493764000000'; // EDITAR: poné el número real con código país (sin +)
const STORE_NAME = 'Natural';
const STORAGE_KEY = 'natural_cart_v1';
const CURRENCY = 'ARS';
const FORMATTER = new Intl.NumberFormat('es-AR', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });

// Catálogo: preferir cargar desde el backend `/api/natural/catalog`.
const DEFAULT_PRODUCTS = [
  { id: 'tapioca-mixta', name: 'Caja Tapioca Mixta', label: 'Caja Mixta', description: '10 paquetes de 500g + 10 paquetes de 1Kg. La opción para abastecer la semana o tu negocio.', badges: [{ text: 'Sin TACC', cls: 'tacc' }, { text: 'Pack', cls: 'organic' }], price: 129000, unit: 'caja', featured: true },
  { id: 'tapioca-500', name: 'Tapioca 500g', label: 'Tapioca 500g', description: 'Almidón de mandioca premium. Sin TACC. Para panes, tortillas y rebozados.', badges: [{ text: 'Sin TACC', cls: 'tacc' }, { text: 'Vegano', cls: 'vegan' }], price: 4700, unit: 'paquete' },
  { id: 'tapioca-1000', name: 'Tapioca 1Kg', label: 'Tapioca 1Kg', description: 'Formato familiar de tapioca, rendidor y sin gluten. Para repostería y cocina diaria.', badges: [{ text: 'Sin TACC', cls: 'tacc' }, { text: 'Vegano', cls: 'vegan' }], price: 8200, unit: 'paquete' },
];
let PRODUCTS = DEFAULT_PRODUCTS.slice();

// === DOM refs ===
const grid = document.getElementById('productGrid');
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartClose = document.getElementById('cartClose');
const cartCount = document.getElementById('cartCount');
const cartBody = document.getElementById('cartBody');
const cartTotal = document.getElementById('cartTotal');
const cartWa = document.getElementById('cartWa');
const contactWa = document.getElementById('contactWa');
const footerWa = document.getElementById('footerWa');
const closingWa = document.getElementById('closingWa');
const siteHeader = document.getElementById('siteHeader');
const yearEl = document.getElementById('year');

let cart = loadCart();

// === Cart persistence ===
function loadCartFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch {}
}

async function loadProducts() {
  try {
    const res = await fetch('/api/natural/catalog');
    if (!res.ok) throw new Error('catalog fetch failed')
    const json = await res.json();
    if (json && Array.isArray(json.products) && json.products.length) {
      PRODUCTS = json.products.map((p) => ({
        id: p.id,
        slug: p.slug,
        code: p.code,
        name: p.name,
        label: p.name,
        description: p.shortDescription || p.longDescription || '',
        badges: (p.badges || []).map((b) => ({ text: b, cls: '' })),
        price: Number(p.unitPrice || 0),
        unit: 'unidad',
        featured: !!p.featuredOrder,
        mainImagePath: p.mainImagePath,
      }))
      return;
    }
  } catch (e) {
    // fallback to defaults
    PRODUCTS = DEFAULT_PRODUCTS.slice();
  }
}

async function loadCartFromServer() {
  try {
    const res = await fetch('/api/natural/cart');
    if (!res.ok) { cart = loadCartFromLocalStorage(); return }
    const json = await res.json();
    if (json?.cart?.lines) {
      cart = {};
      json.cart.lines.forEach((line) => {
        cart[line.productId] = { id: line.id, qty: line.quantity, unitPrice: Math.round(line.unitPrice) };
      });
      saveCart();
    } else {
      cart = {};
    }
  } catch (e) {
    cart = loadCartFromLocalStorage();
  }
}

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id || p.slug === id || p.code === id);
}

// === Render ===
function renderProducts() {
  const html = PRODUCTS.map((p, idx) => {
    // Alternate sage/peach Quick Add for visual rhythm (idx 1 = sage)
    const sage = idx === 1 ? ' is-sage' : '';
    return `
    <article class="product-card${sage} reveal" data-id="${p.id}">
      <div class="product-media">
        <div class="badges">
          ${p.badges.map((b) => `<span class="badge ${b.cls}">${b.text}</span>`).join('')}
        </div>
        <div class="label">${p.label}</div>
      </div>
      <div class="product-info">
        <h3 class="product-title">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-price">${FORMATTER.format(p.price)}<span class="unit">/ ${p.unit}</span></div>
        <button class="add-btn" data-add="${p.id}" aria-label="Agregar ${p.name} al carrito">Quick Add</button>
      </div>
    </article>
  `;
  }).join('');
  grid.innerHTML = html;
  // Re-observe newly created reveal nodes
  if (window._reveal_io) {
    grid.querySelectorAll('.reveal').forEach((el) => window._reveal_io.observe(el));
  }
}

function renderCart() {
  const items = Object.values(cart);
  if (!items.length) {
    cartBody.innerHTML = '<p class="cart-empty">Tu carrito está vacío.<br/>Agregá productos del catálogo para comenzar.</p>';
    cartTotal.textContent = FORMATTER.format(0);
    cartCount.textContent = '0';
    cartWa.disabled = true;
    return;
  }
  let total = 0;
  let count = 0;
  cartBody.innerHTML = items.map((item) => {
    const product = findProduct(item.id);
    if (!product) return '';
    const subtotal = product.price * item.qty;
    total += subtotal;
    count += item.qty;
    return `
      <div class="cart-item" data-id="${product.id}">
        <div>
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-meta">${FORMATTER.format(product.price)} / ${product.unit}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-dec="${product.id}" aria-label="Restar">&minus;</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-inc="${product.id}" aria-label="Sumar">+</button>
          </div>
          <button class="cart-item-remove" data-remove="${product.id}">Quitar</button>
        </div>
        <div class="cart-item-price">${FORMATTER.format(subtotal)}</div>
      </div>
    `;
  }).join('');
  cartTotal.textContent = FORMATTER.format(total);
  cartCount.textContent = String(count);
  cartWa.disabled = false;
}

// === Cart actions ===
async function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;
  try {
    const res = await fetch('/api/natural/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id, quantity: 1 }),
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js.ok) {
      await loadCartFromServer();
      renderCart();
      openCart();
      return;
    }
  } catch (e) {
    // fallback to local
  }
  // local fallback behavior
  if (cart[id]) cart[id].qty += 1; else cart[id] = { qty: 1 };
  saveCart(); renderCart(); openCart();
}

async function changeQty(id, delta) {
  if (!cart[id]) return;
  const existing = cart[id];
  const target = Math.max(0, (existing.qty || 0) + delta);
  if (!existing.id) {
    // no server item id: fallback to local
    if (target === 0) delete cart[id]; else cart[id].qty = target;
    saveCart(); renderCart(); return;
  }
  try {
    if (target === 0) {
      await fetch(`/api/natural/cart/items/${existing.id}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/natural/cart/items/${existing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: target }) });
    }
    await loadCartFromServer(); renderCart();
  } catch (e) {
    // fallback local
    if (target === 0) delete cart[id]; else cart[id].qty = target;
    saveCart(); renderCart();
  }
}

async function removeFromCart(id) {
  const existing = cart[id];
  if (!existing) return;
  if (existing.id) {
    try {
      await fetch(`/api/natural/cart/items/${existing.id}`, { method: 'DELETE' });
      await loadCartFromServer(); renderCart(); return;
    } catch (e) {}
  }
  delete cart[id]; saveCart(); renderCart();
}

function openCart() {
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartBackdrop.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartBackdrop.classList.remove('visible');
  document.body.style.overflow = '';
}

// === WhatsApp checkout ===
function buildOrderMessage() {
  const items = Object.values(cart);
  if (!items.length) return '';
  const lines = ['Hola Natural! Quisiera hacer este pedido:', ''];
  let total = 0;
  for (const item of items) {
    const p = findProduct(item.id);
    if (!p) continue;
    const subtotal = p.price * item.qty;
    total += subtotal;
    lines.push(`• ${item.qty} × ${p.name} — ${FORMATTER.format(subtotal)}`);
  }
  lines.push('');
  lines.push(`Total: ${FORMATTER.format(total)}`);
  lines.push('');
  lines.push('¿Coordinamos entrega/retiro y forma de pago? Gracias!');
  return lines.join('\n');
}

function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

// === Event delegation ===
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.matches('[data-add]')) addToCart(t.getAttribute('data-add'));
  else if (t.matches('[data-inc]')) changeQty(t.getAttribute('data-inc'), 1);
  else if (t.matches('[data-dec]')) changeQty(t.getAttribute('data-dec'), -1);
  else if (t.matches('[data-remove]')) removeFromCart(t.getAttribute('data-remove'));
});

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

cartWa.addEventListener('click', () => {
  const msg = buildOrderMessage();
  if (!msg) return;
  openWhatsApp(msg);
});

function bindContactWa(el, message) {
  if (!el) return;
  el.addEventListener('click', (e) => { e.preventDefault(); openWhatsApp(message); });
}
bindContactWa(contactWa, 'Hola Natural! Tengo una consulta.');
bindContactWa(closingWa, 'Hola Natural! Quiero pedir un producto que no veo en el catálogo.');
bindContactWa(footerWa, 'Hola Natural!');
bindContactWa(document.getElementById('footerEnvios'), 'Hola Natural! Una consulta sobre envíos.');
bindContactWa(document.getElementById('footerRetiros'), 'Hola Natural! Una consulta sobre retiros.');
bindContactWa(document.getElementById('footerPagos'), 'Hola Natural! Una consulta sobre formas de pago.');

// === Sticky header elevation on scroll ===
function onScroll() {
  if (!siteHeader) return;
  if (window.scrollY > 8) siteHeader.classList.add('scrolled');
  else siteHeader.classList.remove('scrolled');
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// === Reveal-on-scroll animations ===
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  window._reveal_io = io;
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}

// === Wholesale account request form ===
const wholesaleForm = document.getElementById('wholesaleForm');
const wholesaleStatus = document.getElementById('wholesaleStatus');

if (wholesaleForm && wholesaleStatus) {
  wholesaleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    wholesaleStatus.classList.remove('success', 'error');
    wholesaleStatus.textContent = '';

    const data = new FormData(wholesaleForm);
    const payload = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim() || null,
      businessName: String(data.get('businessName') || '').trim() || null,
      cuit: String(data.get('cuit') || '').trim() || null,
      address: String(data.get('address') || '').trim() || null,
      city: String(data.get('city') || '').trim() || null,
      message: String(data.get('message') || '').trim() || null,
      segmentSlug: String(data.get('segmentSlug') || 'wholesale'),
    };

    if (!payload.name || payload.name.length < 2) {
      wholesaleStatus.textContent = 'Necesitamos tu nombre.';
      wholesaleStatus.classList.add('error');
      return;
    }
    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      wholesaleStatus.textContent = 'Ingresá un email válido.';
      wholesaleStatus.classList.add('error');
      return;
    }

    wholesaleForm.classList.add('is-submitting');
    wholesaleStatus.textContent = 'Enviando...';

    try {
      const res = await fetch('/api/natural/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No pudimos enviar tu solicitud. Probá de nuevo en unos minutos.');
      }
      wholesaleStatus.textContent = json.alreadyPending
        ? 'Ya tenemos tu solicitud anterior. Te respondemos pronto.'
        : '¡Recibimos tu solicitud! Te contactamos en breve con las credenciales.';
      wholesaleStatus.classList.add('success');
      wholesaleForm.reset();
    } catch (e) {
      wholesaleStatus.textContent = (e && e.message) || 'No pudimos enviar tu solicitud.';
      wholesaleStatus.classList.add('error');
    } finally {
      wholesaleForm.classList.remove('is-submitting');
    }
  });
}

// === Footer year ===
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// === Init ===
async function initStorefront() {
  await loadProducts();
  await loadCartFromServer();
  renderProducts();
  renderCart();
}

initStorefront();
