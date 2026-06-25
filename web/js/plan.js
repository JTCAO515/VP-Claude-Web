// Plan view — itinerary builder. Two modes:
//   - Bound to a trip (tripId given): persists via /api/trips/<id>, dates
//     live on the trip (start_date), Plan only controls day_count.
//   - Scratch (no tripId): persists via /api/itinerary + localStorage meta,
//     for quick exploration before committing to a trip.
//
// Destinations are picked via the city-picker sheet (no more prompt()).
// Days are a simple stepper (count only) — specific calendar dates belong
// to the Trip, set from the Trips tab.
// Map renders via Amap when configured (web/js/map.js), else a striped
// placeholder with numbered pins, matching the original wireframe.

import { api } from './api.js';
import * as sidebar from './sidebar.js';
import { pickCities } from './components/citypicker.js';
import { renderMap } from './map.js';

const PACE = ['Relaxed', 'Balanced', 'Packed'];
const META_KEY = 'vp.plan.meta';

let state = {
  root: null,
  tripId: null,
  destinations: [],
  day_count: 3,
  travelers: 2,
  pace: 'Relaxed',
  days: [],
  active_day: 0,
  citiesCache: [],
  generating: false,
  onBackToTrips: null,
};

export function mount({ container, tripId = null, onBackToTrips = null }) {
  state.root = container;
  container.classList.add('view-plan');
  state.tripId = tripId;
  state.onBackToTrips = onBackToTrips;
  init();
}

async function init() {
  await loadCitiesCache();
  if (state.tripId) {
    await loadTrip(state.tripId);
  } else {
    loadScratchMeta();
    await loadScratchItinerary();
  }
  publishTripContext();
  render();
}

async function loadCitiesCache() {
  try {
    const data = await api.get('/api/cities');
    state.citiesCache = data.cities || [];
  } catch (_) { state.citiesCache = []; }
}

async function loadTrip(tripId) {
  try {
    const data = await api.get('/api/trips/' + tripId);
    const t = data.trip;
    state.destinations = t.cities || [];
    state.day_count = t.day_count || 3;
    state.days = (t.days && t.days.length) ? t.days : seedDays();
    state._trip = t;
  } catch (_) {
    state.tripId = null;
    loadScratchMeta();
    await loadScratchItinerary();
  }
}

function loadScratchMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    state.destinations = raw.destinations || [];
    state.day_count = raw.day_count || 3;
    state.travelers = raw.travelers || 2;
    state.pace = raw.pace || 'Relaxed';
  } catch (_) {}
  if (state.destinations.length === 0 && state.citiesCache.length) {
    state.destinations = state.citiesCache.slice(0, 3).map((c) => ({ id: c.id, name: c.name, cn: c.cn }));
    saveScratchMeta();
  }
}
function saveScratchMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({
      destinations: state.destinations,
      day_count: state.day_count,
      travelers: state.travelers,
      pace: state.pace,
    }));
  } catch (_) {}
}

async function loadScratchItinerary() {
  try {
    const data = await api.get('/api/itinerary');
    state.days = (data.days && data.days.length) ? data.days : seedDays();
  } catch (_) {
    state.days = seedDays();
  }
}

function seedDays() {
  return Array.from({ length: state.day_count }, (_, i) => ({
    day_index: i + 1,
    label: 'Day ' + (i + 1),
    city: state.destinations[i % Math.max(state.destinations.length, 1)]?.name || '',
    stops: i === 0 ? [
      { time: '08:30', name: 'Forbidden City', desc: 'Walk through the imperial palace complex.', tags: ['Landmark', '2h'] },
      { time: '11:30', name: 'Jingshan Park lunch', desc: 'Climb for a view, then a hutong cafe.', tags: ['Food', '$$'] },
    ] : [],
  }));
}

function publishTripContext() {
  const name = state._trip?.name || state.destinations.map((d) => d.name).join(' → ') || 'Untitled trip';
  const dates = state._trip?.start_date
    ? `From ${state._trip.start_date} · ${state.day_count} days`
    : `${state.day_count} days · no start date yet`;
  sidebar.setTripContext({ name, dates, city_count: state.destinations.length || undefined });
}

function render() {
  if (!state.root) return;
  state.root.innerHTML = '';
  if (state.onBackToTrips) state.root.appendChild(renderBackLink());
  state.root.appendChild(renderToolbar());
  state.root.appendChild(renderBody());
}

function renderBackLink() {
  const bar = document.createElement('div');
  bar.style.cssText = 'padding:10px 22px 0;display:flex;align-items:center;gap:6px';
  const link = document.createElement('button');
  link.type = 'button';
  link.textContent = '← All trips';
  link.style.cssText = 'background:none;border:none;font-size:var(--text-base);color:var(--ink-5);cursor:pointer;font-weight:500';
  link.addEventListener('mouseenter', () => { link.style.color = 'var(--brand)'; });
  link.addEventListener('mouseleave', () => { link.style.color = 'var(--ink-5)'; });
  link.addEventListener('click', () => state.onBackToTrips());
  bar.appendChild(link);
  if (state._trip) {
    const sep = document.createElement('span');
    sep.textContent = '· ' + (state._trip.name || 'Untitled trip');
    sep.style.cssText = 'font-size:var(--text-base);color:var(--ink-soft)';
    bar.appendChild(sep);
  }
  return bar;
}

function renderToolbar() {
  const bar = document.createElement('section');
  bar.className = 'plan-toolbar';

  // Destinations
  const dest = document.createElement('div');
  dest.className = 'plan-field destinations';
  dest.innerHTML = `<div class="label">DESTINATIONS</div>`;
  const destBox = document.createElement('div');
  destBox.className = 'box';
  for (const d of state.destinations) {
    const chip = document.createElement('span');
    chip.className = 'dest-chip';
    chip.innerHTML = `${esc(d.name)} <span class="x">×</span>`;
    chip.querySelector('.x').addEventListener('click', () => {
      state.destinations = state.destinations.filter((x) => x.id !== d.id);
      persistMeta(); publishTripContext(); render();
    });
    destBox.appendChild(chip);
  }
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'add-dest';
  add.textContent = '+ add…';
  add.addEventListener('click', async () => {
    const picked = await pickCities(state.destinations.map((d) => d.id));
    if (picked) {
      state.destinations = picked;
      persistMeta(); publishTripContext(); render();
    }
  });
  destBox.appendChild(add);
  dest.appendChild(destBox);
  bar.appendChild(dest);

  // Days stepper (replaces date range — dates live on the Trip)
  const days = document.createElement('div');
  days.className = 'plan-field dates';
  days.innerHTML = `<div class="label">DAYS</div>`;
  const daysBox = document.createElement('div');
  daysBox.className = 'box';
  daysBox.style.justifyContent = 'space-between';
  daysBox.innerHTML = `
    <button type="button" class="day-step-btn" data-d="-1" style="border:none;background:none;font-size:16px;color:var(--ink-3);cursor:pointer">−</button>
    <span style="font-weight:600">${state.day_count} ${state.day_count === 1 ? 'day' : 'days'}</span>
    <button type="button" class="day-step-btn" data-d="1" style="border:none;background:none;font-size:16px;color:var(--ink-3);cursor:pointer">+</button>
  `;
  daysBox.querySelectorAll('.day-step-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const delta = +b.dataset.d;
      const next = Math.max(1, Math.min(30, state.day_count + delta));
      if (next === state.day_count) return;
      state.day_count = next;
      adjustDaysArray();
      persistMeta(); publishTripContext(); render();
    });
  });
  days.appendChild(daysBox);
  bar.appendChild(days);

  // Travelers
  const trav = document.createElement('div');
  trav.className = 'plan-field travelers';
  trav.innerHTML = `<div class="label">TRAVELERS</div>`;
  const travBox = document.createElement('div');
  travBox.className = 'box';
  travBox.style.padding = '4px 8px';
  travBox.innerHTML = `<input type="number" id="pf-trav" min="1" max="20" value="${state.travelers}" style="border:none;background:transparent;font:inherit;width:100%">`;
  trav.appendChild(travBox);
  bar.appendChild(trav);

  // Pace
  const pace = document.createElement('div');
  pace.className = 'plan-field pace';
  pace.innerHTML = `<div class="label">PACE</div>`;
  const paceBox = document.createElement('div');
  paceBox.className = 'box';
  paceBox.style.padding = '4px 8px';
  const sel = document.createElement('select');
  sel.id = 'pf-pace';
  sel.style.cssText = 'border:none;background:transparent;font:inherit;width:100%;';
  for (const p of PACE) {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    if (p === state.pace) opt.selected = true;
    sel.appendChild(opt);
  }
  paceBox.appendChild(sel);
  pace.appendChild(paceBox);
  bar.appendChild(pace);

  // Generate
  const gen = document.createElement('button');
  gen.type = 'button';
  gen.className = 'plan-generate';
  gen.disabled = state.generating;
  gen.innerHTML = state.generating
    ? `<span class="spark"></span>Generating…`
    : `<span class="spark"></span>Generate`;
  gen.addEventListener('click', generate);
  bar.appendChild(gen);

  setTimeout(() => {
    const t = bar.querySelector('#pf-trav');
    const p = bar.querySelector('#pf-pace');
    if (t) t.addEventListener('change', (e) => { state.travelers = +e.target.value || 1; persistMeta(); });
    if (p) p.addEventListener('change', (e) => { state.pace = e.target.value; persistMeta(); });
  }, 0);

  return bar;
}

function adjustDaysArray() {
  while (state.days.length < state.day_count) {
    state.days.push({ day_index: state.days.length + 1, label: 'Day ' + (state.days.length + 1), stops: [] });
  }
  if (state.days.length > state.day_count) {
    state.days = state.days.slice(0, state.day_count);
  }
  if (state.active_day >= state.days.length) state.active_day = state.days.length - 1;
}

function renderBody() {
  const body = document.createElement('section');
  body.className = 'plan-body';

  const itin = document.createElement('div');
  itin.className = 'plan-itinerary';

  const tabs = document.createElement('div');
  tabs.className = 'plan-day-tabs';
  for (let i = 0; i < state.days.length; i++) {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'plan-day-tab' + (i === state.active_day ? ' active' : '');
    t.textContent = state.days[i].label || ('Day ' + (i + 1));
    t.addEventListener('click', () => { state.active_day = i; render(); });
    tabs.appendChild(t);
  }
  const addDay = document.createElement('button');
  addDay.type = 'button';
  addDay.className = 'plan-day-add';
  addDay.textContent = '+';
  addDay.addEventListener('click', () => {
    state.day_count = Math.min(30, state.day_count + 1);
    adjustDaysArray();
    state.active_day = state.days.length - 1;
    persistMeta(); render();
  });
  tabs.appendChild(addDay);
  const opt = document.createElement('button');
  opt.type = 'button';
  opt.className = 'plan-optimize';
  opt.textContent = '⟲ Optimize';
  opt.addEventListener('click', generate);
  tabs.appendChild(opt);
  itin.appendChild(tabs);

  const content = document.createElement('div');
  content.className = 'plan-day-content';
  const day = state.days[state.active_day] || state.days[0];
  if (day) {
    const title = document.createElement('div');
    title.className = 'plan-day-title';
    title.textContent = day.label + (day.city ? ' · ' + day.city : '');
    content.appendChild(title);
    const sub = document.createElement('div');
    sub.className = 'plan-day-sub';
    sub.textContent = `${(day.stops || []).length} stops`;
    content.appendChild(sub);

    for (const stop of (day.stops || [])) content.appendChild(renderStop(stop));

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'plan-stop-add';
    add.innerHTML = `<span class="plus">+</span>Add a stop`;
    add.addEventListener('click', () => {
      const name = prompt('What stop? (name)');
      if (!name) return;
      const time = prompt('What time? (e.g. 14:00)', '14:00') || '14:00';
      day.stops = day.stops || [];
      day.stops.push({ time, name, desc: '', tags: [] });
      persistDays(); render();
    });
    content.appendChild(add);
  }
  itin.appendChild(content);
  body.appendChild(itin);

  // Map column
  const mapWrap = document.createElement('div');
  mapWrap.className = 'plan-map';
  body.appendChild(mapWrap);
  mountMap(mapWrap, day);

  return body;
}

function renderStop(stop) {
  const wrap = document.createElement('div');
  wrap.className = 'plan-stop';
  wrap.innerHTML = `
    <div class="time-col">
      <span class="time">${esc(stop.time || '—')}</span>
      <div class="line"></div>
    </div>
    <div class="stop-card">
      <div class="stop-thumb"></div>
      <div class="stop-meta">
        <div class="stop-name">${esc(stop.name || 'Untitled stop')}</div>
        <div class="stop-desc">${esc(stop.desc || '')}</div>
        ${stop.tags && stop.tags.length ? `<div class="tags">${stop.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `;
  return wrap;
}

async function mountMap(container, day) {
  const cityName = day?.city || state.destinations[0]?.name;
  const cityObj = state.citiesCache.find((c) => c.name === cityName) || state.citiesCache[0];
  const hasMap = window.vp.features?.has_map;

  if (!hasMap || !cityObj) {
    renderFallbackMap(container, day, cityObj);
    return;
  }
  const points = (day?.stops || []).slice(0, 6).map((s, i) => ({
    lng: cityObj.lon + (i % 2 === 0 ? 1 : -1) * 0.008 * Math.ceil((i + 1) / 2),
    lat: cityObj.lat + (i % 3 === 0 ? 1 : -1) * 0.006 * Math.ceil((i + 1) / 2),
    label: s.name,
  }));
  container.innerHTML = `<span class="map-tag">amap · ${esc(day?.label || 'day')}</span>`;
  const mapDiv = document.createElement('div');
  mapDiv.style.cssText = 'position:absolute;inset:0;';
  container.appendChild(mapDiv);
  const map = await renderMap(mapDiv, { center: { lng: cityObj.lon, lat: cityObj.lat }, points });
  if (!map) renderFallbackMap(container, day, cityObj); // SDK failed to load despite key present
  appendSuggestStrip(container);
}

function renderFallbackMap(container, day, cityObj) {
  container.innerHTML = `<span class="map-tag">map · ${esc(day?.label || 'day')}</span>`;
  const pins = (day?.stops || []).slice(0, 4);
  pins.forEach((s, i) => {
    const pin = document.createElement('div');
    pin.className = 'pin' + (i >= 2 ? ' muted' : '');
    pin.style.top = (90 + i * 70) + 'px';
    pin.style.left = (100 + (i % 2) * 120) + 'px';
    pin.textContent = i + 1;
    container.appendChild(pin);
  });
  appendSuggestStrip(container);
}

function appendSuggestStrip(container) {
  const suggest = document.createElement('div');
  suggest.className = 'plan-suggest';
  suggest.innerHTML = `
    <div class="panda-mini"></div>
    <div style="flex:1">
      <h4>Panda suggests</h4>
      <p>Save 30 minutes by visiting Jingshan Park before the Forbidden City — same metro stop, less crowded mornings.</p>
      <div class="acts">
        <button class="add" type="button">Add</button>
        <button class="why" type="button">Why?</button>
      </div>
    </div>
  `;
  container.appendChild(suggest);
}

async function generate() {
  if (!state.destinations.length) {
    alert('Add at least one destination first.');
    return;
  }
  state.generating = true;
  render();
  try {
    const res = await api.post('/api/itinerary/generate', {
      cities: state.destinations,
      day_count: state.day_count,
      pace: state.pace,
      travelers: state.travelers,
    });
    state.days = res.days || state.days;
    state.day_count = state.days.length;
    state.active_day = 0;
    await persistDays();
  } catch (_) {
    alert('Could not generate an itinerary. Try again.');
  } finally {
    state.generating = false;
    render();
  }
}

function persistMeta() {
  if (state.tripId) {
    api.put('/api/trips/' + state.tripId, {
      cities: state.destinations, day_count: state.day_count,
    }).catch(() => {});
  } else {
    saveScratchMeta();
  }
}

async function persistDays() {
  if (state.tripId) {
    try {
      await api.put('/api/trips/' + state.tripId, {
        cities: state.destinations, day_count: state.day_count, days: state.days,
      });
    } catch (_) {}
  } else {
    try { await api.put('/api/itinerary', { days: state.days }); } catch (_) {}
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
