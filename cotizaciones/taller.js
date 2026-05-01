'use strict';

const WA_NUMBER = '525657917967';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(amount, currency) {
  currency = currency || 'MXN';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(amount) + ' ' + currency;
}

function carouselHTML(photos, name, id) {
  if (!photos || !photos.length) return '';
  if (photos.length === 1) {
    return `<img class="taller-card-photo" src="${esc(photos[0])}" alt="${esc(name)}" loading="lazy">`;
  }
  const imgs = photos.map(src =>
    `<img src="${esc(src)}" alt="${esc(name)}" loading="lazy">`
  ).join('');
  const dots = photos.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Foto ${i+1}"></button>`
  ).join('');
  return `
    <div class="carousel" id="carousel-${id}" data-current="0">
      <div class="carousel-track">${imgs}</div>
      <button class="carousel-btn prev" aria-label="Anterior">&#8249;</button>
      <button class="carousel-btn next" aria-label="Siguiente">&#8250;</button>
      <div class="carousel-dots">${dots}</div>
    </div>`;
}

function flightRowHTML(f) {
  return `
    <div class="taller-flight-row">
      <div class="taller-flight-route">
        ${esc(f.origin)} <span class="flight-route-arrow">→</span> ${esc(f.destination)}
      </div>
      <div class="taller-flight-meta">
        ${f.date          ? `<span>${esc(f.date)}</span>`                    : ''}
        ${f.time          ? `<span>${esc(f.time)}</span>`                    : ''}
        ${f.airline       ? `<span>${esc(f.airline)}</span>`                 : ''}
        ${f.flight_number ? `<span>Vuelo ${esc(f.flight_number)}</span>`     : ''}
        ${f.duration      ? `<span>${esc(f.duration)}</span>`                : ''}
        ${f.baggage       ? `<span>${esc(f.baggage)}</span>`                 : ''}
      </div>
    </div>`;
}

function renderPaquetes() {
  const section = document.getElementById('taller-paquetes');
  if (!section || !TALLER.paquetes) return;

  const cards = TALLER.paquetes.map((p, i) => {
    if (!p.destination) return '';

    const carousel = carouselHTML(p.photos, p.destination, p.id || i);

    const flightsHTML = p.flights && p.flights.length
      ? `<div class="taller-block">
           <label>Vuelos</label>
           ${p.flights.map(flightRowHTML).join('')}
         </div>`
      : '';

    function hotelBlockHTML(h) {
      const photoHTML = h.photos && h.photos.length
        ? carouselHTML(h.photos, h.name, 'hotel-' + h.name.replace(/\s+/g, ''))
        : '';
      const priceHTML = h.price != null
        ? `<p class="hotel-card-price">${fmt(h.price, h.price_currency || 'USD')}</p>`
        : '';
      return `
        <div class="taller-hotel">
          ${photoHTML}
          <span class="taller-hotel-name">${esc(h.name)}</span>
          <div class="taller-hotel-meta">
            ${h.city      ? `<span>${esc(h.city)}</span>`                  : ''}
            ${h.nights    ? `<span>${esc(h.nights)} noches</span>`         : ''}
            ${h.room_type ? `<span>${esc(h.room_type)}</span>`             : ''}
            ${h.check_in  ? `<span>Check-in: ${esc(h.check_in)}</span>`   : ''}
            ${h.check_out ? `<span>Check-out: ${esc(h.check_out)}</span>` : ''}
          </div>
          ${h.notes ? `<p class="taller-hotel-note">${esc(h.notes)}</p>` : ''}
          ${priceHTML}
        </div>`;
    }

    const hotels = [p.hotel, p.hotel2].filter(Boolean);
    const hotelHTML = hotels.length
      ? `<div class="taller-block">
           <label>Hospedaje</label>
           ${hotels.map(hotelBlockHTML).join('<div class="taller-hotel-divider"></div>')}
         </div>`
      : '';

    const toursHTML = p.tours && p.tours.length
      ? p.tours.map(t => `
        <div class="taller-block">
          <label>Tour incluido</label>
          <div class="taller-tour">
            <div class="taller-tour-header">
              <span class="taller-tour-name">${esc(t.name)}</span>
              <span class="taller-tour-meta">${esc(t.duration)}${t.operator ? ` · ${esc(t.operator)}` : ''}${t.price ? ` · ${esc(t.price)}` : ''}</span>
            </div>
            ${t.itinerary && t.itinerary.length ? `
              <div class="taller-tour-section">
                <label>Itinerario</label>
                <ul class="taller-itinerary">${t.itinerary.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
              </div>` : ''}
            ${t.includes && t.includes.length ? `
              <div class="taller-tour-section">
                <label>Incluye</label>
                <ul class="taller-includes">${t.includes.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
              </div>` : ''}
            ${t.not_includes && t.not_includes.length ? `
              <div class="taller-tour-section">
                <label>No incluye</label>
                <ul class="taller-includes taller-not-includes">${t.not_includes.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
              </div>` : ''}
          </div>
        </div>`).join('')
      : '';

    const includesHTML = p.includes && p.includes.length
      ? `<div class="taller-block">
           <label>Resumen del paquete</label>
           <ul class="taller-includes">
             ${p.includes.map(item => `<li>${esc(item)}</li>`).join('')}
           </ul>
         </div>`
      : '';

    const priceHTML = p.price_total != null
      ? `<div class="taller-price-block">
           <div class="taller-price-total">${fmt(p.price_total, p.currency)}</div>
           <div class="taller-price-sub">para 2 personas · ${fmt(p.price_per_person, p.currency)} por persona</div>
         </div>`
      : `<div class="taller-price-block taller-price-coming">
           <span>${esc(p.price_note || 'Precio próximamente')}</span>
         </div>`;

    return `
      <div class="taller-card">
        ${carousel}
        <div class="taller-card-body">
          <div class="taller-card-header">
            <div>
              <h2 class="taller-card-title">${esc(p.destination)}</h2>
              <p class="taller-card-tagline">${esc(p.tagline)}</p>
            </div>
            <div class="taller-dates-badge">
              <span>${esc(p.dates)}</span>
              ${p.nights ? `<span>${esc(p.nights)} noches</span>` : ''}
            </div>
          </div>
          ${flightsHTML}
          ${hotelHTML}
          ${toursHTML}
          ${includesHTML}
          ${priceHTML}
        </div>
      </div>`;
  }).join('');

  section.innerHTML = `
    <p class="section-label" style="margin-top:48px;">Destinos disponibles</p>
    <h2 style="font-family:var(--serif);font-size:1.7rem;color:var(--green);margin-bottom:32px;">Paquetes 2026–2027</h2>
    ${cards}`;
}

function renderPayment() {
  const section = document.getElementById('taller-payment');
  if (!section || !TALLER.payment) return;
  const p = TALLER.payment;
  section.innerHTML = `
    <div class="container" style="padding-top:0;padding-bottom:40px;">
      <hr class="section-divider">
      <p class="section-label">Datos de pago</p>
      <h2 style="font-family:var(--serif);font-size:1.7rem;color:var(--green);margin-bottom:20px;">Cómo reservar</h2>
      <div class="payment-card">
        <div class="payment-row"><span>Banco</span><strong>${esc(p.bank)}</strong></div>
        <div class="payment-row"><span>CLABE</span><strong class="payment-clabe">${esc(p.clabe)}</strong></div>
        <div class="payment-row"><span>Titular</span><strong>${esc(p.name)}</strong></div>
        ${p.note ? `<p class="payment-note">${esc(p.note)}</p>` : ''}
      </div>
    </div>`;
}

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
    function next() { goTo((parseInt(carousel.dataset.current) + 1) % total); }
    function startAuto() { timer = setInterval(next, 3500); }
    function stopAuto()  { clearInterval(timer); }

    carousel.querySelector('.prev').addEventListener('click', () => { stopAuto(); goTo((parseInt(carousel.dataset.current) - 1 + total) % total); startAuto(); });
    carousel.querySelector('.next').addEventListener('click', () => { stopAuto(); next(); startAuto(); });
    dots.forEach(dot => { dot.addEventListener('click', () => { stopAuto(); goTo(parseInt(dot.dataset.index)); startAuto(); }); });
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    startAuto();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderPaquetes();
  renderPayment();
  initCarousels();
});
