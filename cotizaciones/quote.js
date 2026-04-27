'use strict';

/* ══════════════════════════════════════════════════════════════
   COORDENADA VIAJES — quote.js
   Renders a cotización from a QUOTE data object defined in
   the individual quote HTML file before this script loads.
══════════════════════════════════════════════════════════════ */

const WA_NUMBER = '525657917967';

/* ── Currency formatter ──────────────────────────────────── */
function fmt(amount, currency) {
  currency = currency || 'MXN';
  const number = new Intl.NumberFormat('es-MX', {
    style: 'currency', currency, maximumFractionDigits: 0
  }).format(amount);
  return number + ' MXN';
}

/* ── Escape HTML ─────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── WhatsApp link ───────────────────────────────────────── */
function waLink(quoteRef, clientName) {
  const msg = `Hola, tengo preguntas sobre mi cotización ${quoteRef} — ${clientName}`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* ══════════════════════════════════════════════════════════════
   RENDER FUNCTIONS
══════════════════════════════════════════════════════════════ */

function renderHero(q) {
  const el = document.getElementById('quote-hero');
  if (!el) return;

  const typeLabel = {
    tours:    'Cotización de Tours',
    full:     'Cotización de Viaje Completo',
    cruise:   'Cotización de Crucero',
    hotel:    'Cotización de Hotel',
    mixed:    'Cotización de Viaje',
  }[q.type] || 'Cotización';

  el.innerHTML = `
    <div class="quote-hero-inner">
      <div class="quote-badge">${esc(typeLabel)}</div>
      <h1>${esc(q.destination)}</h1>
      <p class="quote-hero-sub">${esc(q.tagline || '')}</p>
      <div class="quote-meta-grid">
        <span>Cliente<strong>${esc(q.client.name)}</strong></span>
        <span>Viajeros<strong>${esc(q.pax)} personas</strong></span>
        <span>Fechas<strong>${esc(q.dates)}</strong></span>
        <span>Cotización<strong>#${esc(q.ref)}</strong></span>
        <span>Válida hasta<strong>${esc(q.valid_until)}</strong></span>
      </div>
    </div>`;
}

function renderIntro(q) {
  const el = document.getElementById('quote-intro');
  if (!el || !q.intro) return;
  el.innerHTML = `
    <div class="quote-intro container">
      <p class="section-label">Nota introductoria</p>
      <p>${esc(q.intro)}</p>
    </div>`;
}

/* ── Tours ───────────────────────────────────────────────── */
function renderTours(q) {
  const section = document.getElementById('tours-section');
  if (!section || !q.tours || !q.tours.length) {
    if (section) section.style.display = 'none';
    return;
  }

  const cards = q.tours.map((t, tourIdx) => {
    const photos = t.photos && t.photos.length ? t.photos : (t.photo ? [t.photo] : []);
    let photoBlock;
    if (photos.length > 1) {
      const id = `carousel-${tourIdx}`;
      const imgs = photos.map(src =>
        `<img src="${esc(src)}" alt="${esc(t.name)}" loading="lazy">`
      ).join('');
      const dots = photos.map((_, i) =>
        `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Foto ${i+1}"></button>`
      ).join('');
      photoBlock = `
        <div class="carousel" id="${id}" data-current="0">
          <div class="carousel-track">${imgs}</div>
          <button class="carousel-btn prev" aria-label="Anterior">&#8249;</button>
          <button class="carousel-btn next" aria-label="Siguiente">&#8250;</button>
          <div class="carousel-dots">${dots}</div>
        </div>`;
    } else if (photos.length === 1) {
      photoBlock = `<img class="tour-card-photo" src="${esc(photos[0])}" alt="${esc(t.name)}" loading="lazy">`;
    } else {
      photoBlock = `<div class="tour-card-photo-placeholder">sin imagen</div>`;
    }

    const includes = t.includes && t.includes.length
      ? `<div class="tour-card-includes">
           <label>Incluye</label>
           <ul>${t.includes.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
         </div>`
      : '';

    const notIncludes = t.not_includes && t.not_includes.length
      ? `<div class="tour-card-includes">
           <label>No incluye</label>
           <ul>${t.not_includes.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
         </div>`
      : '';

    const pickups = t.pickup_points && t.pickup_points.length
      ? `<div class="tour-detail-block">
           <label>Puntos de salida</label>
           <p>${t.pickup_points.map(esc).join(' · ')}</p>
         </div>`
      : '';

    const totalPrice = t.price_per_person * q.pax;

    return `
      <div class="tour-card">
        ${photoBlock}
        <div class="tour-card-body">
          <h3 class="tour-card-title">${esc(t.name)}</h3>
          <p class="tour-card-duration">${esc(t.duration)}</p>
          <p class="tour-card-desc">${esc(t.description)}</p>
          <div class="tour-card-details">
            ${pickups}
            ${t.schedule ? `<div class="tour-detail-block"><label>Horario</label><p>${esc(t.schedule)}</p></div>` : ''}
            ${t.meeting_point ? `<div class="tour-detail-block"><label>Punto de encuentro</label><p>${esc(t.meeting_point)}</p></div>` : ''}
            ${t.notes ? `<div class="tour-detail-block"><label>Notas</label><p>${esc(t.notes)}</p></div>` : ''}
          </div>
          ${includes}
          ${notIncludes}
          <div class="tour-card-price-row">
            <div class="tour-price-unit">
              ${fmt(t.price_per_person, q.currency)}<span>MXN por persona</span>
            </div>
            <div class="tour-price-total">
              Total ${q.pax} personas (MXN)
              <strong>${fmt(totalPrice, q.currency)}</strong>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  section.innerHTML = `
    <div class="container">
      <h2>Tours recomendados</h2>
      ${cards}
    </div>`;
}

/* ── Flights ─────────────────────────────────────────────── */
function renderFlights(q) {
  const section = document.getElementById('flights-section');
  if (!section || !q.flights || !q.flights.length) {
    if (section) section.style.display = 'none';
    return;
  }

  const cards = q.flights.map(f => `
    <div class="flight-card">
      <div class="flight-route">
        ${esc(f.origin)} <span class="flight-route-arrow">→</span> ${esc(f.destination)}
      </div>
      <div class="flight-meta">
        ${f.date ? `<span>${esc(f.date)}</span>` : ''}
        ${f.airline ? `<span>${esc(f.airline)}</span>` : ''}
        ${f.flight_number ? `<span>Vuelo ${esc(f.flight_number)}</span>` : ''}
        ${f.class ? `<span>${esc(f.class)}</span>` : ''}
        ${f.baggage ? `<span>Equipaje: ${esc(f.baggage)}</span>` : ''}
      </div>
    </div>`).join('');

  section.innerHTML = `
    <div class="container">
      <p class="section-label">Vuelos</p>
      <h2>Vuelos incluidos</h2>
      ${cards}
    </div>`;
}

/* ── Hotels ──────────────────────────────────────────────── */
function renderHotels(q) {
  const section = document.getElementById('hotels-section');
  if (!section || !q.hotels || !q.hotels.length) {
    if (section) section.style.display = 'none';
    return;
  }

  const cards = q.hotels.map(h => {
    const photo = h.photo
      ? `<img src="${esc(h.photo)}" alt="${esc(h.name)}" style="width:100%;height:160px;object-fit:cover;margin-bottom:14px;">`
      : '';
    return `
      <div class="hotel-card">
        ${photo}
        <p class="hotel-name">${esc(h.name)}</p>
        <div class="hotel-meta">
          ${h.category ? `<span>${esc(h.category)}</span>` : ''}
          ${h.city ? `<span>${esc(h.city)}</span>` : ''}
          ${h.check_in ? `<span>Check-in: ${esc(h.check_in)}</span>` : ''}
          ${h.check_out ? `<span>Check-out: ${esc(h.check_out)}</span>` : ''}
          ${h.nights ? `<span>${esc(h.nights)} noches</span>` : ''}
          ${h.room_type ? `<span>${esc(h.room_type)}</span>` : ''}
        </div>
        ${h.notes ? `<p style="font-size:0.83rem;color:var(--muted);margin-top:8px;">${esc(h.notes)}</p>` : ''}
      </div>`;
  }).join('');

  section.innerHTML = `
    <div class="container">
      <p class="section-label">Hospedaje</p>
      <h2>Hoteles seleccionados</h2>
      ${cards}
    </div>`;
}

/* ── Cruise ──────────────────────────────────────────────── */
function renderCruise(q) {
  const section = document.getElementById('cruise-section');
  if (!section || !q.cruise) {
    if (section) section.style.display = 'none';
    return;
  }

  const c = q.cruise;
  const photo = c.photo
    ? `<img src="${esc(c.photo)}" alt="${esc(c.name)}" style="width:100%;height:200px;object-fit:cover;margin-bottom:16px;">`
    : '';

  const includes = c.includes && c.includes.length
    ? `<div class="tour-card-includes" style="margin-top:14px;">
         <label>Incluye</label>
         <ul>${c.includes.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
       </div>`
    : '';

  section.innerHTML = `
    <div class="container">
      <p class="section-label">Crucero</p>
      <h2>${esc(c.name)}</h2>
      <div class="cruise-card">
        ${photo}
        <p style="font-size:0.94rem;line-height:1.7;margin-bottom:14px;">${esc(c.description || '')}</p>
        <div class="hotel-meta" style="margin-bottom:12px;">
          ${c.ship ? `<span>Barco: ${esc(c.ship)}</span>` : ''}
          ${c.line ? `<span>${esc(c.line)}</span>` : ''}
          ${c.departure ? `<span>Salida: ${esc(c.departure)}</span>` : ''}
          ${c.duration ? `<span>${esc(c.duration)}</span>` : ''}
          ${c.cabin_type ? `<span>Cabina: ${esc(c.cabin_type)}</span>` : ''}
          ${c.ports && c.ports.length ? `<span>Puertos: ${c.ports.map(esc).join(' · ')}</span>` : ''}
        </div>
        ${includes}
      </div>
    </div>`;
}

/* ── Pricing summary ─────────────────────────────────────── */
function renderPricing(q) {
  const section = document.getElementById('pricing-section');
  if (!section) return;

  const cur = q.currency || 'MXN';

  const rows = (q.pricing.line_items || []).map(item => `
    <tr>
      <td>${esc(item.description)}</td>
      <td>${item.qty ? esc(String(item.qty)) : '—'}</td>
      <td class="col-amount">${item.amount != null ? fmt(item.amount, cur) : '—'}</td>
    </tr>`).join('');

  const subtotal = q.pricing.subtotal != null
    ? `<tr class="row-subtotal">
         <td colspan="2">Subtotal</td>
         <td class="col-amount">${fmt(q.pricing.subtotal, cur)}</td>
       </tr>` : '';

  const extras = (q.pricing.extras || []).map(e => `
    <tr>
      <td>${esc(e.description)}</td>
      <td>—</td>
      <td class="col-amount">${fmt(e.amount, cur)}</td>
    </tr>`).join('');

  const note = q.pricing.note
    ? `<p class="pricing-note">${esc(q.pricing.note)}</p>` : '';

  section.innerHTML = `
    <div class="container">
      <hr class="section-divider">
      <p class="section-label">Resumen económico</p>
      <h2>Desglose de costos</h2>
      <table class="pricing-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Cant.</th>
            <th style="text-align:right">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${subtotal}
          ${extras}
          <tr class="row-total">
            <td colspan="2"><strong>Total general (${q.pax} personas)</strong></td>
            <td class="col-amount">${fmt(q.pricing.total, cur)}</td>
          </tr>
        </tbody>
      </table>
      ${note}
    </div>`;
}

/* ── Payment ─────────────────────────────────────────────── */
function renderPayment(q) {
  const section = document.getElementById('payment-section');
  if (!section || !q.payment) { if (section) section.style.display = 'none'; return; }
  const p = q.payment;
  const stripeBlock = p.stripe_url ? `
    <div class="payment-or">
      <span>o paga con tarjeta</span>
    </div>
    <a class="payment-stripe-btn" href="${esc(p.stripe_url)}" target="_blank" rel="noopener noreferrer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      Pagar con tarjeta (Stripe)
    </a>` : '';

  section.innerHTML = `
    <div class="container">
      <hr class="section-divider">
      <p class="section-label">Datos de pago</p>
      <h2 style="font-size:1.7rem;color:var(--green);margin-bottom:20px;">Cómo reservar</h2>
      <div class="payment-card">
        <div class="payment-row"><span>Banco</span><strong>${esc(p.bank)}</strong></div>
        <div class="payment-row"><span>CLABE</span><strong class="payment-clabe">${esc(p.clabe)}</strong></div>
        <div class="payment-row"><span>Titular</span><strong>${esc(p.name)}</strong></div>
        ${p.note ? `<p class="payment-note">${esc(p.note)}</p>` : ''}
        ${stripeBlock}
      </div>
    </div>`;
}

/* ── CTA band ────────────────────────────────────────────── */
function renderCTA(q) {
  const el = document.getElementById('quote-cta');
  if (!el) return;
  el.innerHTML = `
    <p>¿Tienes preguntas sobre tu cotización? Escríbenos por WhatsApp.</p>
    <a class="btn-cta" href="${waLink(q.ref, q.client.name)}" target="_blank" rel="noopener">
      Contactar a Coordenada Viajes
    </a>`;
}

/* ── Footer ──────────────────────────────────────────────── */
function renderFooter(q) {
  const el = document.getElementById('quote-footer-content');
  if (!el) return;

  const conditions = (q.terms || [
    'Esta cotización es válida únicamente hasta la fecha indicada.',
    'Los precios están sujetos a disponibilidad al momento de confirmar.',
    'Se requiere un depósito del 30% para reservar.',
    'Los precios no incluyen gastos personales, propinas ni servicios no mencionados.',
  ]);

  el.innerHTML = `
    <div class="quote-footer-inner">
      <div>
        <h4>Vigencia y condiciones</h4>
        <ul>${conditions.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>
      <div>
        <h4>Próximos pasos</h4>
        <p>Para confirmar tu reservación contáctanos por WhatsApp o Instagram. Con gusto resolvemos cualquier duda y ajustamos lo que necesites.</p>
        <p style="margin-top:10px;">
          <a href="https://wa.me/525657917967" target="_blank" rel="noopener" style="color:var(--gold);">WhatsApp: +52 55 6579 1796</a><br>
          <a href="https://instagram.com/coordenada.viajes" target="_blank" rel="noopener" style="color:var(--gold);">IG: @coordenada.viajes</a>
        </p>
      </div>
      <div class="quote-footer-brand">
        <img src="../images/logo-icono.svg" alt="Coordenada Viajes" style="height:80px;width:auto;">
        <span class="quote-footer-contact">Coordenada Viajes · Ciudad de México</span>
        <div class="quote-footer-powered">
          <span>Powered by</span>
          <img src="../images/eureka-websites/eureka-bird.png" alt="Eureka Websites" class="footer-powered-bird">
          <span>Eureka Websites</span>
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   INIT — called once QUOTE is defined in the HTML
══════════════════════════════════════════════════════════════ */
function initCarousels() {
  document.querySelectorAll('.carousel').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const dots  = carousel.querySelectorAll('.carousel-dot');
    const total = track.querySelectorAll('img').length;
    let timer;

    function goTo(idx) {
      carousel.dataset.current = idx;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    function next() {
      const cur = parseInt(carousel.dataset.current);
      goTo((cur + 1) % total);
    }

    function startAuto() { timer = setInterval(next, 3500); }
    function stopAuto()  { clearInterval(timer); }

    carousel.querySelector('.prev').addEventListener('click', () => {
      stopAuto();
      const cur = parseInt(carousel.dataset.current);
      goTo((cur - 1 + total) % total);
      startAuto();
    });
    carousel.querySelector('.next').addEventListener('click', () => {
      stopAuto();
      next();
      startAuto();
    });
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        stopAuto();
        goTo(parseInt(dot.dataset.index));
        startAuto();
      });
    });

    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);

    startAuto();
  });
}

function renderQuote() {
  if (typeof QUOTE === 'undefined') {
    console.error('QUOTE data object not defined.');
    return;
  }

  document.title = `Cotización ${QUOTE.destination} — Coordenada Viajes`;

  renderHero(QUOTE);
  renderIntro(QUOTE);
  renderTours(QUOTE);
  renderFlights(QUOTE);
  renderHotels(QUOTE);
  renderCruise(QUOTE);
  renderPricing(QUOTE);
  renderPayment(QUOTE);
  renderCTA(QUOTE);
  renderFooter(QUOTE);
  initCarousels();
}

document.addEventListener('DOMContentLoaded', renderQuote);
