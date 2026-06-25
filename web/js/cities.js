// Cities — browse curated cities. Search + filters + sort. Hero featured card + grid.
// Clicking a card opens a detail sheet: pick a category — Hotels / Dining /
// Attractions — each backed by /api/partners/* (curated data + a Trip.com/
// Meituan book link) with Amap rating badges where available.

import { api } from './api.js';
import { openSheet, closeSheet, sheetHeader } from './components/sheet.js';
import { fetchRatings, matchRating, ratingBadge } from './ratings.js';

const CATEGORIES = [
  { key: 'hotels',      label: 'Hotels',      endpoint: 'hotels',      itemsKey: 'hotels',      ratingCat: 'hotel',      bookLabel: 'Book on Trip.com →' },
  { key: 'dining',      label: 'Dining',      endpoint: 'deals',       itemsKey: 'deals',       ratingCat: 'dining',     bookLabel: 'Book on Meituan →' },
  { key: 'attractions', label: 'Attractions', endpoint: 'attractions', itemsKey: 'attractions', ratingCat: 'attraction', bookLabel: 'View on Trip.com →' },
];

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
  const cache = {};       // category.key -> { items, book_url, ratings }
  let activeCat = CATEGORIES[0].key;

  const content = document.createElement('div');
  content.className = 'sheet-content';
  content.appendChild(sheetHeader(city.name));
  content.innerHTML += `
    <div class="detail-hero"><span class="name">${esc(city.name)}</span></div>
    <p style="font-size:var(--text-base);color:var(--ink-5);line-height:1.5">${esc(city.tagline || '')}</p>
    <p style="font-size:var(--text-sm);color:var(--ink-soft);margin:2px 0 14px">Best months: ${esc(city.best_months || '—')}</p>
    <div class="cat-tabs"></div>
    <div class="detail-list" id="city-cat-results"><div class="skeleton" style="height:60px"></div></div>
    <button class="btn-outline" type="button" id="city-cat-book" style="margin-top:10px;display:none;width:100%"></button>
    <div class="sheet-footer-actions">
      <button class="btn-outline" type="button" data-act="close">Close</button>
      <button class="btn-primary" type="button" data-act="add-to-plan">+ Add to Trip</button>
    </div>
  `;
  openSheet(content, { wide: true });
  content.querySelector('[data-act="close"]').addEventListener('click', () => closeSheet());
  content.querySelector('[data-act="add-to-plan"]').addEventListener('click', () => {
    closeSheet();
    if (state.onAddToPlan) state.onAddToPlan(city);
  });

  const tabsRoot = content.querySelector('.cat-tabs');
  for (const cat of CATEGORIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-tab' + (cat.key === activeCat ? ' active' : '');
    btn.textContent = cat.label;
    btn.addEventListener('click', () => {
      activeCat = cat.key;
      tabsRoot.querySelectorAll('.cat-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      showCategory(cat);
    });
    tabsRoot.appendChild(btn);
  }

  async function showCategory(cat) {
    const resultsRoot = content.querySelector('#city-cat-results');
    const bookBtn = content.querySelector('#city-cat-book');
    bookBtn.style.display = 'none';
    if (!cache[cat.key]) {
      resultsRoot.innerHTML = `<div class="skeleton" style="height:60px"></div>`;
      const [partnerRes, ratingPois] = await Promise.all([
        api.get(`/api/partners/${cat.endpoint}?city=${city.id}`).catch(() => null),
        fetchRatings(city.id, cat.ratingCat),
      ]);
      cache[cat.key] = {
        items: partnerRes ? (partnerRes[cat.itemsKey] || []) : [],
        book_url: partnerRes ? partnerRes.book_url : null,
        ratings: ratingPois,
      };
    }
    if (activeCat !== cat.key) return; // a faster tab switch happened meanwhile
    renderCategory(cat, cache[cat.key], resultsRoot, bookBtn);
  }

  showCategory(CATEGORIES[0]);
}

function renderCategory(cat, data, resultsRoot, bookBtn) {
  const { items, book_url, ratings } = data;
  resultsRoot.innerHTML = items.length
    ? items.map((item) => itemCardHTML(cat.key, item, ratings)).join('')
    : `<div class="meta" style="padding:8px 0">No curated ${esc(cat.label.toLowerCase())} yet for this city.</div>`;
  if (book_url) {
    bookBtn.style.display = '';
    bookBtn.textContent = cat.bookLabel;
    bookBtn.onclick = () => window.open(book_url, '_blank');
  }
}

function itemCardHTML(catKey, item, ratings) {
  if (catKey === 'hotels') {
    return `
      <div class="detail-card">
        <div class="name">${esc(item.name)}${ratingBadge(matchRating(ratings, item.name))}</div>
        <div class="meta">${esc(item.neighborhood || '')} · ★ ${item.rating ?? '—'} · ${esc(item.price_band || '')}</div>
      </div>
    `;
  }
  if (catKey === 'dining') {
    return `
      <div class="detail-card">
        <div class="name">${esc(item.title)}${ratingBadge(matchRating(ratings, item.vendor))}</div>
        <div class="meta">${esc(item.vendor || '')} · ${esc(item.discount || '')}</div>
      </div>
    `;
  }
  // attractions
  return `
    <div class="detail-card">
      <div class="name">${esc(item.name)}${ratingBadge(matchRating(ratings, item.name))}</div>
      <div class="meta">${esc(item.category || '')} · ${esc(item.duration || '')} · ${esc(item.price_band || '')}</div>
      ${item.summary ? `<div class="meta" style="margin-top:4px">${esc(item.summary)}</div>` : ''}
    </div>
  `;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
