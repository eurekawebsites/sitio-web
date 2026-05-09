'use strict';

/* ══════════════════════════════════════════════════════════════
   COORDENADA VIAJES — main.js
   • Mobile nav toggle
   • Load + render trips from data/trips.json
   • Monthly payment (domiciliado) via Stripe Checkout
══════════════════════════════════════════════════════════════ */

const WHATSAPP = '525657917967';

// Firebase Hosting rewrite: /api → Firebase Function
const API_BASE = '/api';

/* ── Helpers ─────────────────────────────────────────────── */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function waLink(destination) {
  const text = encodeURIComponent('Hola, me interesa el viaje a ' + destination);
  return `https://wa.me/${WHATSAPP}?text=${text}`;
}

function fmtMxn(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
}

/* ── Payment installment calculator ─────────────────────────
   Counts full calendar months from today until 1 month before
   the departure date. Minimum 1, maximum 24.
──────────────────────────────────────────────────────────── */
function calcInstallments(departureDateIso) {
  const today     = new Date();
  const departure = new Date(departureDateIso + 'T12:00:00'); // noon to avoid TZ edge cases
  const deadline  = new Date(departure);
  deadline.setMonth(deadline.getMonth() - 1); // 1 month before departure

  const months =
    (deadline.getFullYear() - today.getFullYear()) * 12 +
    (deadline.getMonth() - today.getMonth());

  return Math.max(1, Math.min(24, months));
}

/* ── Mobile Nav ──────────────────────────────────────────── */
(function initNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const links     = document.getElementById('nav-links');
  if (!hamburger || !links) return;

  hamburger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Abrir menú');
    });
  });
})();

/* ── Trip card renderers ─────────────────────────────────── */

function photoWrap(trip) {
  const photos = trip.photos && trip.photos.length ? trip.photos
                 : trip.photo ? [trip.photo] : [];

  if (photos.length > 1) {
    const slides = photos.map((src, i) =>
      `<img src="${esc(src)}" alt="${esc(trip.name)}" loading="lazy" class="tc-slide${i===0?' active':''}">`
    ).join('');
    const dots = photos.map((_, i) =>
      `<button class="tc-dot${i===0?' active':''}" data-i="${i}"></button>`
    ).join('');
    return `
      <div class="trip-photo-wrap trip-carousel">
        ${slides}
        <button class="tc-btn tc-prev">&#8249;</button>
        <button class="tc-btn tc-next">&#8250;</button>
        <div class="tc-dots">${dots}</div>
        <div class="trip-date-badge">${esc(trip.departure_date)}</div>
      </div>`;
  }

  const img = photos.length === 1
    ? `<img src="${esc(photos[0])}" alt="${esc(trip.name)}" loading="lazy">` : '';
  return `
    <div class="trip-photo-wrap">
      ${img}
      <div class="trip-date-badge">${esc(trip.departure_date)}</div>
    </div>`;
}

function initTripCarousels() {
  document.querySelectorAll('.trip-carousel').forEach(c => {
    const imgs = c.querySelectorAll('.tc-slide');
    const dots = c.querySelectorAll('.tc-dot');
    const total = imgs.length;
    let cur = 0;

    function goTo(idx) {
      imgs[cur].classList.remove('active');
      dots[cur].classList.remove('active');
      cur = (idx + total) % total;
      imgs[cur].classList.add('active');
      dots[cur].classList.add('active');
    }

    c.querySelector('.tc-prev').addEventListener('click', () => goTo(cur - 1));
    c.querySelector('.tc-next').addEventListener('click', () => goTo(cur + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  });
}

function paymentBlock(trip) {
  if (!trip.price_total_mxn || !trip.departure_date_iso) return '';

  const installments    = trip.payment_months || calcInstallments(trip.departure_date_iso);
  const amountPerMonth  = Math.ceil(trip.price_total_mxn / installments);
  const monthLabel      = installments === 1 ? 'mensualidad' : 'mensualidades';

  return `
    <div class="trip-payment-block btn-pay"
      data-trip-id="${esc(trip.id)}"
      data-trip-name="${esc(trip.name)}"
      data-total="${trip.price_total_mxn}"
      data-installments="${installments}"
      role="button"
      tabindex="0"
      aria-label="Pagar con tarjeta — ${fmtMxn(amountPerMonth)}/mes"
    >
      <div class="trip-payment-header">
        <svg class="trip-payment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        <span class="trip-payment-label">Pago mensual domiciliado</span>
      </div>
      <div class="trip-payment-amount">
        <span class="trip-payment-price">${fmtMxn(amountPerMonth)}</span>
        <span class="trip-payment-mo">MXN/mes</span>
      </div>
      <p class="trip-payment-detail">${installments} ${monthLabel} · Total ${fmtMxn(trip.price_total_mxn)} MXN por persona</p>
      <p class="trip-payment-cta">Pagar con tarjeta &rarr;</p>
    </div>`;
}

function renderDetailedCard(t) {
  const includesItems = (t.includes || []).map(entry => {
    const text = typeof entry === 'string' ? entry : (entry.item || '');
    return text ? `<li class="trip-includes-item">${esc(text)}</li>` : '';
  }).join('');

  const includesBlock = includesItems ? `
    <p class="trip-includes-label">El viaje incluye</p>
    <ul class="trip-includes-grid">${includesItems}</ul>` : '';

  const highlightBlock = t.highlight_note ? `
    <p class="trip-highlight">${esc(t.highlight_note)}</p>` : '';

  const priceBlock = t.price_from ? `
    <div class="trip-price-block">
      <p class="trip-price-label">Desde</p>
      <p class="trip-price">${esc(t.price_from)}</p>
      ${t.price_note ? `<p class="trip-price-note">${esc(t.price_note)}</p>` : ''}
    </div>` : '';

  return `
    <article class="trip-card trip-card--detailed">
      ${photoWrap(t)}
      <div class="trip-body">
        ${t.route ? `<p class="trip-route">${esc(t.route)}</p>` : ''}
        <h3 class="trip-title">${esc(t.name)}</h3>
        <p class="trip-meta">${esc(t.departure_date)}${t.duration ? ' &nbsp;·&nbsp; ' + esc(t.duration) : ''}</p>
        ${includesBlock}
        ${highlightBlock}
        ${priceBlock}
        ${paymentBlock(t)}
        <div class="trip-footer">
          <a href="${waLink(t.destination)}"
             target="_blank"
             rel="noopener noreferrer"
             class="btn btn-green">
            Quiero información
          </a>
        </div>
      </div>
    </article>`;
}

function renderSimpleCard(t) {
  return `
    <article class="trip-card trip-card--simple">
      ${photoWrap(t)}
      <div class="trip-body">
        ${t.route ? `<p class="trip-route">${esc(t.route)}</p>` : ''}
        <h3 class="trip-title">${esc(t.name)}</h3>
        <span class="trip-pill">Próximamente</span>
        ${t.teaser ? `<p class="trip-teaser">${esc(t.teaser)}</p>` : ''}
        <div class="trip-footer">
          <a href="${waLink(t.destination)}"
             target="_blank"
             rel="noopener noreferrer"
             class="btn btn-outline-dark">
            Consultar disponibilidad
          </a>
        </div>
      </div>
    </article>`;
}

/* ── Stripe Checkout ─────────────────────────────────────── */

async function startCheckout(btn) {
  if (btn.dataset.loading) return;
  const tripId      = btn.dataset.tripId;
  const tripName    = btn.dataset.tripName;
  const totalMxn    = parseInt(btn.dataset.total, 10);
  const installments = parseInt(btn.dataset.installments, 10);

  btn.dataset.loading = '1';
  const cta = btn.querySelector('.trip-payment-cta');
  if (cta) cta.textContent = 'Redirigiendo…';

  try {
    const res = await fetch(API_BASE + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        tripName,
        totalMxn,
        installments,
        successUrl: window.location.origin + '/?pago=exitoso',
        cancelUrl:  window.location.href,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Error al iniciar el pago.');
    }

    window.location.href = data.url;
  } catch (err) {
    console.error('[checkout]', err);
    delete btn.dataset.loading;
    const cta = btn.querySelector('.trip-payment-cta');
    if (cta) cta.textContent = 'Pagar con tarjeta →';
    alert('No se pudo conectar con el servicio de pago. Intenta de nuevo o escríbenos por WhatsApp.');
  }
}

function initPayButtons() {
  document.querySelectorAll('.btn-pay').forEach(btn => {
    btn.addEventListener('click', () => startCheckout(btn));
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startCheckout(btn); }
    });
  });
}

/* ── Success banner ──────────────────────────────────────── */
function checkSuccessBanner() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('pago') !== 'exitoso') return;

  const banner = document.createElement('div');
  banner.className = 'pago-success-banner';
  banner.innerHTML = `
    <span>¡Pago registrado! Te llegará un correo de confirmación de Stripe. ✓</span>
    <button class="pago-success-close" aria-label="Cerrar">×</button>
  `;
  document.body.prepend(banner);
  banner.querySelector('.pago-success-close').addEventListener('click', () => {
    banner.remove();
    history.replaceState({}, '', window.location.pathname);
  });
}

/* ── Load & render trips ─────────────────────────────────── */

async function loadTrips() {
  const grid = document.getElementById('trips-grid');
  if (!grid) return;

  try {
    const res = await fetch('data/trips.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const all = await res.json();

    const visible = all
      .filter(t => t.active !== false)
      .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

    if (visible.length === 0) {
      grid.innerHTML = `
        <p class="trips-empty">
          Próximos viajes en camino.<br>
          <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener"
             style="color:var(--gold)">Escríbenos</a> para más información.
        </p>`;
      return;
    }

    grid.innerHTML = visible
      .map(t => t.detailed ? renderDetailedCard(t) : renderSimpleCard(t))
      .join('');

    initTripCarousels();
    initPayButtons();

  } catch (err) {
    console.error('[Coordenada Viajes] Error loading trips:', err);
    grid.innerHTML = `<p class="trips-empty">No se pudieron cargar los viajes. Intenta más tarde.</p>`;
  }
}

checkSuccessBanner();
loadTrips();
