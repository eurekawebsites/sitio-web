'use strict';

/* ══════════════════════════════════════════════════════════════
   COORDENADA VIAJES — main.js
   • Mobile nav toggle
   • Load + render trips from data/trips.json
══════════════════════════════════════════════════════════════

   DATA NOTE:
   The site reads data/trips.json (single array file).
   The Decap CMS folder collection (admin/config.yml) creates
   individual files in data/trips/ — one per trip.
   Until a Netlify build step aggregates those files, manage trips
   by editing data/trips.json directly.
══════════════════════════════════════════════════════════════ */

const WHATSAPP = '525657917967';

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

  // Close on any link click (mobile UX)
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

function carouselWrap(trip) {
  const slides = trip.photos.map((src, i) => `
    <div class="carousel-slide${i === 0 ? ' active' : ''}">
      <img src="${esc(src)}" alt="${esc(trip.name)} ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}">
    </div>`).join('');

  const dots = trip.photos.map((_, i) => `
    <button class="carousel-dot${i === 0 ? ' active' : ''}" aria-label="Foto ${i + 1}"></button>`).join('');

  return `
    <div class="trip-photo-wrap" data-carousel>
      <div class="trip-carousel">
        ${slides}
        <button class="carousel-btn carousel-btn--prev" aria-label="Anterior">&#8249;</button>
        <button class="carousel-btn carousel-btn--next" aria-label="Siguiente">&#8250;</button>
        <div class="carousel-dots">${dots}</div>
      </div>
      <div class="trip-date-badge">${esc(trip.departure_date)}</div>
    </div>`;
}

function photoWrap(trip) {
  if (trip.photos && trip.photos.length > 1) return carouselWrap(trip);
  // If no photo, the green background of .trip-photo-wrap serves as placeholder.
  // Never render a broken <img>.
  const img = trip.photo
    ? `<img src="${esc(trip.photo)}" alt="${esc(trip.name)}" loading="lazy">`
    : ''; // placeholder = CSS background-color on .trip-photo-wrap
  return `
    <div class="trip-photo-wrap">
      ${img}
      <div class="trip-date-badge">${esc(trip.departure_date)}</div>
    </div>`;
}

function renderDetailedCard(t) {
  /* Includes list — handles both string[] and {item: string}[] formats */
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

  } catch (err) {
    console.error('[Coordenada Viajes] Error loading trips:', err);
    grid.innerHTML = `<p class="trips-empty">No se pudieron cargar los viajes. Intenta más tarde.</p>`;
  }
}

/* ── Carousel logic ──────────────────────────────────────── */

function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach(wrap => {
    const slides = wrap.querySelectorAll('.carousel-slide');
    const dots   = wrap.querySelectorAll('.carousel-dot');
    const prev   = wrap.querySelector('.carousel-btn--prev');
    const next   = wrap.querySelector('.carousel-btn--next');
    if (!slides.length) return;

    let current = 0;
    let timer   = null;

    function goTo(idx) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (idx + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function startAuto() {
      timer = setInterval(() => goTo(current + 1), 4000);
    }

    function stopAuto() {
      clearInterval(timer);
    }

    prev.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
    next.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); });
    });

    wrap.addEventListener('mouseenter', stopAuto);
    wrap.addEventListener('mouseleave', startAuto);

    startAuto();
  });
}

loadTrips().then(initCarousels);
