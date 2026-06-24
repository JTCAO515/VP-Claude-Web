// Dashboard drawer — city chips + 6 chapters (Now / Stay / Eat / Move / Plan / Toolbox).
import { api } from './api.js';
import { chop } from './components/chop.js';
import * as itinerary from './itinerary.js';

let state = {
  open: false,
  city: null,
  cities: [],
  weather: null,
  hotels: [],
  deals: [],
  tools: [],
  loading: false,
};

const $drawer = () => document.getElementById('view-dashboard');
const $backdrop = () => document.getElementById('drawer-backdrop');

export function open() {
  state.open = true;
  const initial = (window.vp && window.vp.city) || 'beijing';
  setCity(initial);
  ensureCities().then(() => render());
  const d = $drawer(); const b = $backdrop();
  d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
  b.hidden = false; requestAnimationFrame(() => b.classList.add('open'));
  b.onclick = close;
}

export function close() {
  state.open = false;
  const d = $drawer(); const b = $backdrop();
  d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
  b.classList.remove('open');
  setTimeout(() => { b.hidden = true; }, 200);
}

async function ensureCities() {
  if (state.cities.length) return;
  try {
    const data = await api.get('/api/cities');
    state.cities = data.cities || [];
  } catch (_) {}
}

function setCity(id) {
  state.city = id;
  if (window.vp) window.vp.city = id;
  localStorage.setItem('vp.city', id);
}

function render() {
  const d = $drawer();
  const cityObj = state.cities.find((c) => c.id === state.city);
  d.innerHTML = `
    <header class="drawer-bar">
      <button class="close" id="dash-close">←</button>
      <span class="wordmark">
        <em class="zh">视野</em><strong>Dashboard</strong>
      </span>
      <span class="chop stamp-in">览</span>
    </header>
    <nav class="city-chips" id="dash-cities"></nav>
    <section class="chapter" data-key="now">
      <h2><span>Now<span class="zh-tag">此刻</span></span><span class="chop sm stamp-in">今</span></h2>
      <div class="chapter-body" id="ch-now"><div class="skeleton" style="height: 120px"></div></div>
    </section>
    <section class="chapter" data-key="stay">
      <h2><span>Stay<span class="zh-tag">居</span></span><span class="chop sm stamp-in" style="animation-delay:80ms">居</span></h2>
      <div class="chapter-body" id="ch-stay"><div class="skeleton" style="height: 80px"></div></div>
    </section>
    <section class="chapter" data-key="eat">
      <h2><span>Eat &amp; Do<span class="zh-tag">食</span></span><span class="chop sm stamp-in" style="animation-delay:140ms">食</span></h2>
      <div class="chapter-body" id="ch-eat"><div class="skeleton" style="height: 80px"></div></div>
    </section>
    <section class="chapter" data-key="move">
      <h2><span>Move<span class="zh-tag">行</span></span><span class="chop sm stamp-in" style="animation-delay:200ms">行</span></h2>
      <div class="chapter-body" id="ch-move"></div>
    </section>
    <section class="chapter" data-key="plan">
      <h2><span>Plan<span class="zh-tag">程</span></span><span class="chop sm stamp-in" style="animation-delay:260ms">程</span></h2>
      <div class="chapter-body" id="ch-plan"></div>
    </section>
    <section class="chapter" data-key="toolbox">
      <h2><span>Toolbox<span class="zh-tag">具</span></span><span class="chop sm stamp-in" style="animation-delay:320ms">具</span></h2>
      <div class="chapter-body" id="ch-toolbox"></div>
    </section>
  `;
  d.querySelector('#dash-close').addEventListener('click', close);
  renderCityChips();
  loadAndRenderChapters();
}

function renderCityChips() {
  const root = document.getElementById('dash-cities');
  if (!root) return;
  root.innerHTML = '';
  for (const c of state.cities) {
    const btn = document.createElement('button');
    btn.className = 'city-chip' + (c.id === state.city ? ' active' : '');
    btn.innerHTML = `<span class="en">${esc(c.name)}</span><span class="zh">${esc(c.cn)}</span>`;
    btn.addEventListener('click', () => {
      setCity(c.id);
      renderCityChips();
      loadAndRenderChapters();
    });
    root.appendChild(btn);
  }
}

async function loadAndRenderChapters() {
  const city = state.cities.find((c) => c.id === state.city);
  if (!city) return;
  const [weather, hotels, deals, tools] = await Promise.all([
    api.get(`/api/weather?lat=${city.lat}&lon=${city.lon}`).catch(() => null),
    api.get('/api/hotels?city=' + city.id).catch(() => ({ hotels: [] })),
    api.get('/api/deals?city=' + city.id).catch(() => ({ deals: [] })),
    api.get('/api/tools').catch(() => ({ tools: [] })),
  ]);
  state.weather = weather;
  state.hotels = hotels.hotels || [];
  state.deals = deals.deals || [];
  state.tools = tools.tools || [];

  renderNow(city);
  renderStay();
  renderEat();
  renderMove(city);
  renderPlan();
  renderToolbox();
}

function renderNow(city) {
  const root = document.getElementById('ch-now');
  if (!root) return;
  const w = state.weather;
  const wcard = w ? `
    <div class="weather-card">
      <div class="temp">${Math.round(w.temperature_c ?? 0)}°</div>
      <div>
        <div class="meta">${esc(city.name)} · ${esc(city.cn)}</div>
        <div class="summary">${weatherSummary(w)}</div>
        <div class="meta">Humidity ${w.humidity ?? '–'}% · Wind ${Math.round(w.wind_kmh ?? 0)} km/h</div>
      </div>
    </div>` : '<div class="empty-msg">Weather unavailable.</div>';
  const deal = state.deals[0];
  const dealCard = deal ? `
    <div class="deal-card">
      <div class="title">${esc(deal.title)}</div>
      <div class="vendor">${esc(deal.vendor)}</div>
      <div class="meta-row"><span class="discount">${esc(deal.discount)}</span></div>
    </div>` : '';
  root.innerHTML = wcard + dealCard;
}

function renderStay() {
  const root = document.getElementById('ch-stay');
  if (!root) return;
  if (!state.hotels.length) { root.innerHTML = '<div class="empty-msg">No curated hotels yet for this city.</div>'; return; }
  root.innerHTML = state.hotels.map((h) => `
    <div class="hotel-card">
      <div class="name">${esc(h.name)}</div>
      <div class="neighborhood">${esc(h.neighborhood)}</div>
      <div class="meta-row">
        <span>★ ${h.rating} · Metro ${h.metro_min} min</span>
        <span class="price">${esc(h.price_band)}</span>
      </div>
      <div class="badges">
        ${h.english_service ? '<span class="badge">EN service ✓</span>' : ''}
        ${h.foreign_card ? '<span class="badge cool">Foreign card ✓</span>' : '<span class="badge warm">Card: CN only</span>'}
      </div>
    </div>
  `).join('');
}

function renderEat() {
  const root = document.getElementById('ch-eat');
  if (!root) return;
  if (!state.deals.length) { root.innerHTML = '<div class="empty-msg">No curated deals yet for this city.</div>'; return; }
  root.innerHTML = state.deals.map((d) => `
    <div class="deal-card">
      <div class="title">${esc(d.title)}</div>
      <div class="vendor">${esc(d.vendor)}</div>
      <div class="meta-row">
        <span class="discount">${esc(d.discount)}</span>
        <span>${d.english_menu ? 'EN menu ✓' : '中文 only'}</span>
      </div>
      ${d.address_en ? `<div class="address">${esc(d.address_en)} · ${esc(d.address_cn || '')}</div>` : ''}
    </div>
  `).join('');
}

function renderMove(city) {
  const root = document.getElementById('ch-move');
  if (!root) return;
  root.innerHTML = `
    <div class="map-tile">
      <span class="map-label">${esc(city.name)} downtown</span>
      <span class="center-pin"></span>
    </div>
    <div class="hotel-card">
      <div class="name">Trains &amp; Metro</div>
      <div class="neighborhood">12306 for high-speed rail · Alipay QR for metro</div>
    </div>
  `;
}

async function renderPlan() {
  const root = document.getElementById('ch-plan');
  if (!root) return;
  let days = [];
  try { days = await itinerary.get(); } catch (_) { days = []; }
  root.innerHTML = '';
  const wrap = document.createElement('div');
  for (const [i, d] of days.entries()) {
    const card = document.createElement('div');
    card.className = 'itinerary-day';
    card.innerHTML = `
      <div class="day-title">${esc(d.label || ('Day ' + (i + 1)))}</div>
      ${['morning', 'afternoon', 'evening'].map((slot) => `
        <label class="slot">
          <span class="label">${cap(slot)}</span>
          <input type="text" data-day="${i}" data-slot="${slot}" value="${esc(d.slots?.[slot] || '')}" placeholder="Plan a stop…">
        </label>
      `).join('')}
    `;
    wrap.appendChild(card);
  }
  const controls = document.createElement('div');
  controls.className = 'itinerary-controls';
  controls.innerHTML = `
    <button id="add-day">＋ Add day</button>
    <button id="save-itin" class="save-itin">${window.vp.user ? 'Save' : 'Save locally'}</button>
  `;
  wrap.appendChild(controls);
  root.appendChild(wrap);
  wrap.querySelector('#add-day').addEventListener('click', async () => {
    days.push({ day_index: days.length + 1, label: 'Day ' + (days.length + 1),
                slots: { morning: '', afternoon: '', evening: '' } });
    await itinerary.save(days);
    renderPlan();
  });
  wrap.querySelector('#save-itin').addEventListener('click', async () => {
    const inputs = wrap.querySelectorAll('input[data-day]');
    inputs.forEach((inp) => {
      const di = +inp.dataset.day;
      days[di].slots = days[di].slots || {};
      days[di].slots[inp.dataset.slot] = inp.value;
    });
    await itinerary.save(days);
    const btn = wrap.querySelector('#save-itin');
    const orig = btn.textContent;
    btn.textContent = '✓ Saved';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

function renderToolbox() {
  const root = document.getElementById('ch-toolbox');
  if (!root) return;
  if (!state.tools.length) { root.innerHTML = '<div class="empty-msg">Tools unavailable.</div>'; return; }
  root.innerHTML = '';
  for (const t of state.tools) {
    const el = document.createElement('div');
    el.className = 'tool-card';
    el.innerHTML = `
      <span class="indicator">+</span>
      <div class="title">${esc(t.title)}</div>
      <div class="summary">${esc(t.summary)}</div>
      <ol class="steps">${(t.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    `;
    el.addEventListener('click', () => {
      el.classList.toggle('open');
      el.querySelector('.indicator').textContent = el.classList.contains('open') ? '−' : '+';
    });
    root.appendChild(el);
  }
}

function weatherSummary(w) {
  const t = w.temperature_c ?? 22;
  if (t < 5) return 'Chilly — bundle up.';
  if (t < 12) return 'Cool — bring a jacket.';
  if (t < 22) return 'Pleasant — light layers.';
  if (t < 30) return 'Warm — stay hydrated.';
  return 'Hot — siesta hours indoors.';
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
