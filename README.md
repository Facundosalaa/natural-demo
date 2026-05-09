# Natural — demo storefront

Demo de e-commerce para **Natural**, almacén saludable de productos sin TACC, veganos y orgánicos.

Storefront premium **liviano**: HTML + CSS + JS vanilla servido por `nginx:alpine`, sin build, sin backend. El checkout abre WhatsApp con un mensaje prefilled (carrito armado en `localStorage`).

🌐 **Demo live**: https://ordenya.zubuagency.com/tienda

---

## ¿Por qué tan liviano?

Esta versión es **demo**, no producto final. La idea fue lograr una experiencia visual premium con el mínimo footprint posible:

| Métrica | Valor |
|---|---|
| Imagen Docker | ~5 MB (`nginx:alpine`) |
| Total assets | ~15 KB (HTML + CSS + JS sin minificar) |
| Build | ninguno — bind mount directo |
| Dependencias runtime | nginx |
| Memoria que pide | ~10 MB RAM |
| Backend / DB | ninguno (catálogo hardcoded en `app.js`, carrito en `localStorage`) |

Para una versión productiva con catálogo dinámico, login B2B, listas de precios por segmento, integración con Mercado Pago Checkout Pro y persistencia en PostgreSQL, ver el branch `feature/natural-ecommerce` del repo ORDENYA original (Etapas 2-3 del proyecto).

---

## Stack

- **nginx:alpine** — servidor estático con gzip, cache headers, security headers.
- **HTML5 vanilla** — sin frameworks.
- **CSS** — Plus Jakarta Sans (Google Fonts CDN), Design System propio (paleta `#46724E`, sombras suaves, radii grandes, responsive mobile-first).
- **JavaScript ES6** — carrito en `localStorage`, sin libs.
- **Docker Compose + Traefik** — para deploy con HTTPS automático.

---

## Estructura

```
natural-demo/
├── public/
│   ├── index.html         ← markup + base href="/tienda/"
│   ├── styles.css         ← design system Natural
│   └── app.js             ← catálogo + carrito + checkout WhatsApp
├── nginx.conf             ← config nginx (gzip, cache, security)
├── natural-demo.compose.yml  ← docker compose con labels Traefik
└── README.md
```

---

## Configuración crítica

### Número de WhatsApp

Editar `public/app.js` línea 6:

```js
const WHATSAPP_NUMBER = '5493764000000'; // EDITAR: poné el número real con código país (sin +)
```

Formato: código país + área + número, **sin** `+`, espacios ni guiones. Ejemplo Argentina Posadas: `549376412345678`.

### Catálogo

Editar el array `PRODUCTS` en `public/app.js` (líneas 13-37). Cada producto:

```js
{
  id: 'tapioca-500',          // único
  name: 'Tapioca 500g',       // nombre largo
  label: 'Tapioca 500g',      // texto del placeholder visual
  description: '...',
  badges: [{ text: 'Sin TACC', cls: 'tacc' }],  // tacc | vegan | organic
  price: 4700,                // en ARS, sin decimales
  unit: 'paquete',            // paquete | caja | kg | …
}
```

### Paleta / fuente

Definidas como CSS custom properties en `public/styles.css` (`:root` al tope). Para cambiar la marca, editar esos tokens.

---

## Correr local

```bash
docker compose -f natural-demo.compose.yml up -d
# abrir http://localhost  (sin TLS local)
```

Para correr local sin Traefik (más simple):

```bash
docker run --rm -p 8080:80 \
  -v "$(pwd)/public:/usr/share/nginx/html:ro" \
  -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine
# http://localhost:8080
```

---

## Deploy a VPS

Asume Docker + Traefik con cert-resolver `mytlschallenge` y network externa `proxy` (es la config existente de zubuagency.com).

```bash
# 1) Subir archivos al VPS
scp -r natural-demo root@<vps>:/opt/

# 2) Levantar container
ssh root@<vps>
cd /opt/natural-demo
docker compose -f natural-demo.compose.yml up -d

# 3) Verificar
curl https://ordenya.zubuagency.com/tienda
```

Traefik detecta el container, pide cert TLS automáticamente y enruta `Host('ordenya.zubuagency.com') && PathPrefix('/tienda')` al nginx. La middleware `stripprefix` quita `/tienda` antes de pasar la request a nginx, por eso los assets se sirven desde root del bind mount.

---

## Roadmap (si la demo se valida y se quiere escalar)

1. Catálogo desde DB real (`Product` de PostgreSQL).
2. Auth B2B (minorista / mayorista) con precios diferenciados.
3. Carrito persistido server-side, con merge guest→cuenta al login.
4. Checkout con Mercado Pago Checkout Pro real, generando `Order` en el ERP.
5. Notificaciones por WhatsApp via n8n + Evolution API.
6. Admin Natural en el ERP existente (segmentos, listas de precios, promociones).

Ese trabajo está parcialmente hecho en el branch `feature/natural-ecommerce` del repo ORDENYA — Etapas 2 (DB) y 3 (APIs) están completas, falta UI Storefront integrada.

---

## Licencia

Privado / propietario. Uso interno Natural / OrdenYa.
