// Natural — demo storefront
// Carrito en localStorage, checkout abre WhatsApp con mensaje prefilled.
// Microinteracciones: reveal on scroll, sticky header con elevación.

const WHATSAPP_NUMBER = '5493764000000'; // EDITAR: poné el número real con código país (sin +)
const STORE_NAME = 'Natural';
const STORAGE_KEY = 'natural_cart_v1';
const CURRENCY = 'ARS';
const FORMATTER = new Intl.NumberFormat('es-AR', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });

// Catálogo (datos reales de los 3 productos sembrados, normalizados a precio unidad consumidor final).
const PRODUCTS = [
  {
    id: 'tapioca-mixta',
    name: 'Caja Tapioca Mixta',
    label: 'Caja Mixta',
    description: '10 paquetes de 500g + 10 paquetes de 1Kg. La opción para abastecer la semana o tu negocio.',
    badges: [{ text: 'Sin TACC', cls: 'tacc' }, { text: 'Pack', cls: 'organic' }],
    price: 129000,
    unit: 'caja',
    featured: true,
  },
  {
    id: 'tapioca-500',
    name: 'Tapioca 500g',
    label: 'Tapioca 500g',
    description: 'Almidón de mandioca premium. Sin TACC. Para panes, tortillas y rebozados.',
    badges: [{ text: 'Sin TACC', cls: 'tacc' }, { text: 'Vegano', cls: 'vegan' }],
    price: 4700,
    unit: 'paquete',
  },
  {
    id: 'tapioca-1000',
    name: 'Tapioca 1Kg',
    label: 'Tapioca 1Kg',
    description: 'Formato familiar de tapioca, rendidor y sin gluten. Para repostería y cocina diaria.',
    badges: [{ text: 'Sin TACC', cls: 'tacc' }, { text: 'Vegano', cls: 'vegan' }],
    price: 8200,
    unit: 'paquete',
  },
];

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
function loadCart() {
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

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

// === Render ===
function renderProducts() {
  const html = PRODUCTS.map((p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-media">
        <div class="badges">
          ${p.badges.map((b) => `<span class="badge ${b.cls}">${b.text}</span>`).join('')}
        </div>
        <div class="label">${p.label}</div>
      </div>
      <div class="product-body">
        <h3 class="product-title">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-foot">
          <div class="product-price">${FORMATTER.format(p.price)}<span class="unit">/ ${p.unit}</span></div>
          <button class="add-btn" data-add="${p.id}" aria-label="Agregar ${p.name} al carrito">Agregar</button>
        </div>
      </div>
    </article>
  `).join('');
  grid.innerHTML = html;
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
function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;
  if (cart[id]) {
    cart[id].qty += 1;
  } else {
    cart[id] = { id, qty: 1 };
  }
  saveCart();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty = Math.max(0, cart[id].qty + delta);
  if (cart[id].qty === 0) delete cart[id];
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
  renderCart();
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
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}

// === Footer year ===
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// === Init ===
renderProducts();
renderCart();
