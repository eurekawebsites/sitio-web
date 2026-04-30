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

function photoWrap(trip) {
  const photos = trip.photos && trip.photos.length ? trip.photos
                 : trip.photo ? [trip.photo] : [];

  if (photos.length > 1) {
    const id = 'tc-' + trip.id;
    const imgs = photos.map(src =>
      `<img src="${esc(src)}" alt="${esc(trip.name)}" loading="lazy">`
    ).join('');
    const dots = photos.map((_, i) =>
      `<button class="tc-dot${i===0?' active':''}" data-i="${i}"></button>`
    ).join('');
    return `
      <div class="trip-photo-wrap trip-carousel" id="${esc(id)}" data-cur="0">
        <div class="tc-track">${imgs}</div>
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
    const track = c.querySelector('.tc-track');
    const imgs  = track.querySelectorAll('img');
    const dots  = c.querySelectorAll('.tc-dot');
    const total = imgs.length;

    // Set each image width equal to the carousel container width
    function setWidths() {
      const w = c.offsetWidth;
      if (!w) return;
      track.style.width = (w * total) + 'px';
      imgs.forEach(img => { img.style.width = w + 'px'; });
    }
    requestAnimationFrame(() => { setWidths(); goTo(0); });
    window.addEventListener('resize', () => { setWidths(); goTo(+c.dataset.cur); });

    function goTo(idx) {
      c.dataset.cur = idx;
      const w = c.offsetWidth;
      track.style.transform = `translateX(-${idx * w}px)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }
    function next() { goTo((+c.dataset.cur + 1) % total); }

    c.querySelector('.tc-prev').addEventListener('click', () => goTo((+c.dataset.cur - 1 + total) % total));
    c.querySelector('.tc-next').addEventListener('click', () => next());
    dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.i)));
  });
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

    initTripCarousels();

  } catch (err) {
    console.error('[Coordenada Viajes] Error loading trips:', err);
    grid.innerHTML = `<p class="trips-empty">No se pudieron cargar los viajes. Intenta más tarde.</p>`;
  }
}

loadTrips();
