// Cities — browse curated cities. Search + filters + sort. Hero featured card + grid.
// Clicking a card opens a detail sheet with hotels/deals + "Add to Plan".

import { api } from './api.js';
import { openSheet, closeSheet, sheetHeader } from './components/sheet.js';
import { fetchRatings, matchRating, ratingBadge } from './ratings.js';

let state = {
  root: null,
  cities: [],
  query: '',
  featured: null,
  onAddToPlan: null,
};

export function mount({ container, onAddToPlan }) {
  state.root = container;
  state.onAddToPlan = onAddToPlan;
  container.classList.add('view-cities');
  load();
}

async function load() {
  try {
    const data = await api.get('/api/cities');
    state.cities = data.cities || [];
    state.featured = state.cities.find((c) => c.id === 'chengdu') || state.cities[0];
  } catch (_) {
    state.cities = [];
  }
  render();
}

function render() {
  if (!state.root) return;
  const filtered = state.query
    ? state.cities.filter((c) =>
        c.name.toLowerCase().includes(state.query.toLowerCase()) ||
        (c.cn || '').includes(state.query) ||
        (c.tagline || '').toLowerCase().includes(state.query.toLowerCase())
      )
    : state.cities;

  state.root.innerHTML = `
    <section class="cities-toolbar">
      <div class="cities-search">
        <span class="glyph"></span>
        <input type="search" placeholder="Search a city…" value="${esc(state.query)}">
      </div>
      <button class="cities-filter" type="button">Region ▾</button>
      <button class="cities-filter" type="button">Interest ▾</button>
      <button class="cities-filter" type="button">Season ▾</button>
      <button class="cities-sort" type="button">Sort: Popular ▾</button>
    </section>
    <section class="cities-body">
      ${state.featured ? `
        <div class="cities-featured" data-id="${esc(state.featured.id)}">
          <span class="img-tag">image · city hero</span>
          <div class="meta">
            <span class="badge">FEATURED</span>
            <div class="name">${esc(state.featured.name)}</div>
            <div class="tags">
              ${(state.featured.tagline || '').split(/,\s*|\s+·\s+/).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}
      <div class="cities-section-head">
        <div class="title">Popular cities</div>
        <div class="count">${filtered.length} cities</div>
      </div>
      <div class="cities-grid"></div>
    </section>
  `;

  const search = state.root.querySelector('.cities-search input');
  search.addEventListener('input', (e) => {
    state.query = e.target.value;
    render();
  });
  if (state.featured) {
    state.root.querySelector('.cities-featured').addEventListener('click', () => openDetail(state.featured));
  }

  const grid = state.root.querySelector('.cities-grid');
  for (const c of filtered) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'city-card';
    const tags = (c.tagline || '').split(/,\s*|\s+·\s+/).slice(0, 2);
    card.innerHTML = `
      <div class="img">
        <span class="name">${esc(c.name)}</span>
      </div>
      <div class="body">
        <div class="row">
          <span class="heading">${esc(c.cn || c.name)}</span>
          <span class="days">${esc(c.best_months || '')}</span>
        </div>
        <div class="desc">${esc(c.tagline || '')}</div>
        <div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      </div>
    `;
    card.addEventListener('click', () => openDetail(c));
    grid.appendChild(card);
  }
}

async function openDetail(city) {
  const content = document.createElement('div');
  content.className = 'sheet-content';
  content.appendChild(sheetHeader(city.name));
  content.innerHTML += `
    <div class="detail-hero"><span class="name">${esc(city.name)}</span></div>
    <p style="font-size:var(--text-base);color:var(--ink-5);line-height:1.5">${esc(city.tagline || '')}</p>
    <p style="font-size:var(--text-sm);color:var(--ink-soft);margin-top:6px">Best months: ${esc(city.best_months || '—')}</p>
    <div class="detail-section-label">FOREIGNER-FRIENDLY HOTELS</div>
    <div class="detail-list" id="city-hotels"><div class="skeleton" style="height:50px"></div></div>
    <button class="btn-outline" type="button" id="book-hotel-link" style="margin-top:8px;display:none">Book on Trip.com →</button>
    <div class="detail-section-label">DEALS NEARBY</div>
    <div class="detail-list" id="city-deals"><div class="skeleton" style="height:50px"></div></div>
    <button class="btn-outline" type="button" id="book-deal-link" style="margin-top:8px;display:none">Book on Meituan →</button>
    <div class="sheet-footer-actions">
      <button class="btn-outline" type="button" data-act="close">Close</button>
      <button class="btn-primary" type="button" data-act="add-to-plan">+ Add to Plan</button>
    </div>
  `;
  openSheet(content, { wide: true });
  content.querySelector('[data-act="close"]').addEventListener('click', () => closeSheet());
  content.querySelector('[data-act="add-to-plan"]').addEventListener('click', () => {
    closeSheet();
    if (state.onAddToPlan) state.onAddToPlan(city);
  });

  const [hotelsRes, dealsRes, hotelRatings, dealRatings] = await Promise.all([
    api.get('/api/partners/hotels?city=' + city.id).catch(() => ({ hotels: [] })),
    api.get('/api/partners/deals?city=' + city.id).catch(() => ({ deals: [] })),
    fetchRatings(city.id, 'hotel'),
    fetchRatings(city.id, 'dining'),
  ]);
  const hotelsRoot = content.querySelector('#city-hotels');
  hotelsRoot.innerHTML = (hotelsRes.hotels || []).length
    ? hotelsRes.hotels.map((h) => `
        <div class="detail-card">
          <div class="name">${esc(h.name)}${ratingBadge(matchRating(hotelRatings, h.name))}</div>
          <div class="meta">${esc(h.neighborhood)} · ★ ${h.rating} · ${esc(h.price_band)}</div>
        </div>
      `).join('')
    : `<div class="meta" style="padding:8px 0">No curated hotels yet.</div>`;
  if (hotelsRes.book_url) {
    const btn = content.querySelector('#book-hotel-link');
    btn.style.display = '';
    btn.addEventListener('click', () => window.open(hotelsRes.book_url, '_blank'));
  }

  const dealsRoot = content.querySelector('#city-deals');
  dealsRoot.innerHTML = (dealsRes.deals || []).length
    ? dealsRes.deals.map((d) => `
        <div class="detail-card">
          <div class="name">${esc(d.title)}${ratingBadge(matchRating(dealRatings, d.vendor))}</div>
          <div class="meta">${esc(d.vendor)} · ${esc(d.discount)}</div>
        </div>
      `).join('')
    : `<div class="meta" style="padding:8px 0">No curated deals yet.</div>`;
  if (dealsRes.book_url) {
    const btn = content.querySelector('#book-deal-link');
    btn.style.display = '';
    btn.addEventListener('click', () => window.open(dealsRes.book_url, '_blank'));
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
