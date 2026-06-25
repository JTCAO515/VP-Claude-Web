// Booking panels — Hotels / Transport / Group deals, opened from Tools.
// Hotels and Deals call /api/partners/* for curated data + a book_url
// (tracked deep link once Ctrip/Meituan Union keys are configured, a
// safe top-level partner-site link otherwise). Transport collects a
// from/to/date and opens the relevant Trip.com section.

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
    <div class="detail-list" id="hb-results"><div class="meta">Pick a city to see options.</div></div>
  `;
  openSheet(content, { wide: true });
  const sel = content.querySelector('#hb-city');
  await fillCitySelect(sel);
  sel.addEventListener('change', () => search(sel.value));
  if (sel.value) search(sel.value);

  async function search(cityId) {
    const results = content.querySelector('#hb-results');
    results.innerHTML = `<div class="skeleton" style="height:60px"></div>`;
    const [partnerRes, ratingPois] = await Promise.all([
      api.get('/api/partners/hotels?city=' + cityId).catch(() => null),
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
  const content = document.createElement('div');
  content.className = 'sheet-content';
  content.appendChild(sheetHeader('Book transport'));
  content.innerHTML += `
    <form id="tb-form" style="display:flex;flex-direction:column;gap:12px">
      <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
        From
        <input type="text" name="from" placeholder="Beijing" required
          style="padding:10px 12px;border:1px solid var(--line-1);border-radius:8px;background:var(--sidebar-bg);font:inherit;color:var(--ink-1)">
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
        To
        <input type="text" name="to" placeholder="Xi'an" required
          style="padding:10px 12px;border:1px solid var(--line-1);border-radius:8px;background:var(--sidebar-bg);font:inherit;color:var(--ink-1)">
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-base);color:var(--ink-5)">
        Date
        <input type="date" name="date"
          style="padding:10px 12px;border:1px solid var(--line-1);border-radius:8px;background:var(--sidebar-bg);font:inherit;color:var(--ink-1)">
      </label>
      <div style="display:flex;gap:16px;font-size:var(--text-base);color:var(--ink-5)">
        <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="mode" value="train" checked> Train</label>
        <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="mode" value="flight"> Flight</label>
      </div>
      <div id="tb-note" style="font-size:var(--text-sm);color:var(--ink-soft)"></div>
      <button class="btn-primary" type="submit">Search on Trip.com →</button>
    </form>
  `;
  openSheet(content);
  content.querySelector('#tb-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const qs = new URLSearchParams({
      from: fd.get('from') || '', to: fd.get('to') || '',
      date: fd.get('date') || '', mode: fd.get('mode') || 'train',
    });
    try {
      const data = await api.get('/api/partners/transport?' + qs.toString());
      content.querySelector('#tb-note').textContent = data.note || '';
      window.open(data.book_url, '_blank');
    } catch (_) {
      alert('Could not reach transport search.');
    }
  });
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
