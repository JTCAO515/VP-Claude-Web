// Booking panels — Hotels / Transport / Group deals, opened from Tools.
//
// Hotels: city + check-in/out dates → /api/partners/hotels, which builds a
// Ctrip H5 hotel-list deep link (Ctrip Union's API was retired in favor of
// their URL-builder tool — see api/partners.py for the full explanation).
// Transport: separate Train (origin/destination station + date) and Flight
// (origin/destination city + one-way/round-trip + dates) sub-forms, since
// Ctrip's H5 list pages for each take different field names.
// Deals: still Meituan Union (unchanged).

import { api } from '../api.js';
import { openSheet, closeSheet, sheetHeader } from './sheet.js';
import { fetchRatings, matchRating, ratingBadge } from '../ratings.js';

let citiesCache = null;
async function loadCities() {
  if (citiesCache) return citiesCache;
  try {
    const data = await api.get('/api/cities');
    citiesCache = data.cities || [];
  } catch (_) { citiesCache = []; }
  return citiesCache;
}

function dateInputStyle() {
  return `style="padding:10px 12px;border:1px solid var(--line-1);border-radius:8px;background:var(--sidebar-bg);font:inherit;color:var(--ink-1)"`;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultDateRange(startEl, endEl, startDaysFromNow, endDaysFromNow) {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() + startDaysFromNow);
  const end = new Date(now); end.setDate(now.getDate() + endDaysFromNow);
  if (!startEl.value) startEl.value = isoDate(start);
  if (!endEl.value) endEl.value = isoDate(end);
}

function citySelectHTML(id) {
  return `<select id="${id}" style="width:100%;padding:10px 12px;border:1px solid var(--line-1);border-radius:8px;background:var(--sidebar-bg);font:inherit;color:var(--ink-1)"></select>`;
}

async function fillCitySelect(sel) {
  const cities = await loadCities();
  sel.innerHTML = cities.map((c) => `<option value="${c.id}">${c.name} (${c.cn})</option>`).join('');
}

// ---------- Hotels ----------

export async function openHotelBooking() {
  const content = document.createElement('div');
  content.className = 'sheet-content';
  content.appendChild(sheetHeader('Book a hotel'));
  content.innerHTML += `
    <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5);margin-bottom:12px">
      City
      ${citySelectHTML('hb-city')}
    </label>
    <div style="display:flex;gap:10px;margin-bottom:12px">
      <label style="flex:1;display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
        Check in
        <input type="date" id="hb-checkin" ${dateInputStyle()}>
      </label>
      <label style="flex:1;display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
        Check out
        <input type="date" id="hb-checkout" ${dateInputStyle()}>
      </label>
    </div>
    <div class="detail-list" id="hb-results"><div class="meta">Pick a city to see options.</div></div>
  `;
  openSheet(content, { wide: true });
  const sel = content.querySelector('#hb-city');
  const checkinEl = content.querySelector('#hb-checkin');
  const checkoutEl = content.querySelector('#hb-checkout');
  await fillCitySelect(sel);
  defaultDateRange(checkinEl, checkoutEl, 1, 3);
  const triggerSearch = () => search(sel.value, checkinEl.value, checkoutEl.value);
  sel.addEventListener('change', triggerSearch);
  checkinEl.addEventListener('change', triggerSearch);
  checkoutEl.addEventListener('change', triggerSearch);
  if (sel.value) triggerSearch();

  async function search(cityId, checkin, checkout) {
    const results = content.querySelector('#hb-results');
    results.innerHTML = `<div class="skeleton" style="height:60px"></div>`;
    const qs = new URLSearchParams({ city: cityId, checkin: checkin || '', checkout: checkout || '' });
    const [partnerRes, ratingPois] = await Promise.all([
      api.get('/api/partners/hotels?' + qs.toString()).catch(() => null),
      fetchRatings(cityId, 'hotel'),
    ]);
    if (!partnerRes) { results.innerHTML = `<div class="meta">Could not load hotels.</div>`; return; }
    const hotels = partnerRes.hotels || [];
    results.innerHTML = hotels.length
      ? hotels.map((h) => `
          <div class="detail-card">
            <div class="name">${esc(h.name)}${ratingBadge(matchRating(ratingPois, h.name))}</div>
            <div class="meta">${esc(h.neighborhood || '')} ${h.rating ? '· ★ ' + h.rating : ''} ${h.price_band ? '· ' + esc(h.price_band) : ''}</div>
          </div>
        `).join('')
      : `<div class="meta">No curated hotels yet for this city.</div>`;
    const footer = document.createElement('div');
    footer.className = 'sheet-footer-actions';
    footer.innerHTML = `<button class="btn-primary" type="button" style="flex:1" id="hb-book">Book on Trip.com →</button>`;
    footer.querySelector('#hb-book').addEventListener('click', () => window.open(partnerRes.book_url, '_blank'));
    results.appendChild(footer);
  }
}

// ---------- Transport ----------

export function openTransportBooking() {
  let mode = 'train';
  const content = document.createElement('div');
  content.className = 'sheet-content';
  content.appendChild(sheetHeader('Book transport'));
  content.innerHTML += `
    <div class="cat-tabs" style="margin-bottom:16px">
      <button type="button" class="cat-tab active" data-mode="train">🚄 Train</button>
      <button type="button" class="cat-tab" data-mode="flight">✈️ Flight</button>
    </div>
    <form id="tb-form" style="display:flex;flex-direction:column;gap:12px"></form>
  `;
  openSheet(content);
  const form = content.querySelector('#tb-form');
  form.addEventListener('submit', onSubmit);
  content.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      content.querySelectorAll('.cat-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderForm();
    });
  });
  renderForm();

  function renderForm() {
    if (mode === 'train') {
      form.innerHTML = `
        ${textField('tb-from', 'Departure station', 'Beijing')}
        ${textField('tb-to', 'Arrival station', "Xi'an")}
        ${dateField('tb-date', 'Departure date')}
        <div id="tb-note" style="font-size:var(--text-sm);color:var(--ink-soft)"></div>
        <button class="btn-primary" type="submit">Search trains on Trip.com →</button>
      `;
    } else {
      form.innerHTML = `
        ${textField('tb-from', 'Departure city', 'Beijing')}
        ${textField('tb-to', 'Arrival city', 'Shanghai')}
        <div style="display:flex;gap:16px;font-size:var(--text-base);color:var(--ink-5)">
          <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="trip_type" value="oneway" checked> One-way</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="trip_type" value="roundtrip"> Round-trip</label>
        </div>
        ${dateField('tb-date', 'Departure date')}
        <label id="tb-return-wrap" style="display:none;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
          Return date
          <input type="date" id="tb-return-date" ${dateInputStyle()}>
        </label>
        <div id="tb-note" style="font-size:var(--text-sm);color:var(--ink-soft)"></div>
        <button class="btn-primary" type="submit">Search flights on Trip.com →</button>
      `;
      const returnWrap = form.querySelector('#tb-return-wrap');
      form.querySelectorAll('input[name="trip_type"]').forEach((r) => {
        r.addEventListener('change', () => {
          if (r.checked) returnWrap.style.display = r.value === 'roundtrip' ? 'flex' : 'none';
        });
      });
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const qs = new URLSearchParams({
      from: form.querySelector('#tb-from').value || '',
      to: form.querySelector('#tb-to').value || '',
      date: form.querySelector('#tb-date').value || '',
      mode,
    });
    if (mode === 'flight') {
      const tripTypeEl = form.querySelector('input[name="trip_type"]:checked');
      qs.set('trip_type', tripTypeEl ? tripTypeEl.value : 'oneway');
      const returnDate = form.querySelector('#tb-return-date');
      if (returnDate && returnDate.value) qs.set('return_date', returnDate.value);
    }
    try {
      const data = await api.get('/api/partners/transport?' + qs.toString());
      content.querySelector('#tb-note').textContent = data.note || '';
      window.open(data.book_url, '_blank');
    } catch (_) {
      alert('Could not reach transport search.');
    }
  }
}

function textField(id, label, placeholder) {
  return `
    <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
      ${label}
      <input type="text" id="${id}" placeholder="${placeholder}" required
        style="padding:10px 12px;border:1px solid var(--line-1);border-radius:8px;background:var(--sidebar-bg);font:inherit;color:var(--ink-1)">
    </label>
  `;
}

function dateField(id, label) {
  return `
    <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
      ${label}
      <input type="date" id="${id}" ${dateInputStyle()}>
    </label>
  `;
}

// ---------- Group deals ----------

export async function openDealsBooking() {
  const content = document.createElement('div');
  content.className = 'sheet-content';
  content.appendChild(sheetHeader('Group deals'));
  content.innerHTML += `
    <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5);margin-bottom:12px">
      City
      ${citySelectHTML('db-city')}
    </label>
    <div class="detail-list" id="db-results"><div class="meta">Pick a city to see deals.</div></div>
  `;
  openSheet(content, { wide: true });
  const sel = content.querySelector('#db-city');
  await fillCitySelect(sel);
  sel.addEventListener('change', () => search(sel.value));
  if (sel.value) search(sel.value);

  async function search(cityId) {
    const results = content.querySelector('#db-results');
    results.innerHTML = `<div class="skeleton" style="height:60px"></div>`;
    const [partnerRes, ratingPois] = await Promise.all([
      api.get('/api/partners/deals?city=' + cityId).catch(() => null),
      fetchRatings(cityId, 'dining'),
    ]);
    if (!partnerRes) { results.innerHTML = `<div class="meta">Could not load deals.</div>`; return; }
    const deals = partnerRes.deals || [];
    results.innerHTML = deals.length
      ? deals.map((d) => `
          <div class="detail-card">
            <div class="name">${esc(d.title)}${ratingBadge(matchRating(ratingPois, d.vendor))}</div>
            <div class="meta">${esc(d.vendor || '')} · ${esc(d.discount || '')}</div>
          </div>
        `).join('')
      : `<div class="meta">No curated deals yet for this city.</div>`;
    const footer = document.createElement('div');
    footer.className = 'sheet-footer-actions';
    footer.innerHTML = `<button class="btn-primary" type="button" style="flex:1" id="db-book">Book on Meituan →</button>`;
    footer.querySelector('#db-book').addEventListener('click', () => window.open(partnerRes.book_url, '_blank'));
    results.appendChild(footer);
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
