// Sidebar — VisePanda wordmark, + New chat, 4 nav rows with icons,
// Recent chats, Current trip card (shown while inside the Plan builder,
// which is a sub-view of Trips — see app.js), avatar.
//
// Renders into #sidebar. Exposes setActive(tab) and refresh().
//
// 'plan' is not its own nav row — Plan and Trips were merged into one tab.
// app.js still calls setActive('plan') while the itinerary builder is open;
// we highlight the 'trips' row for that state (see highlightKey() below).

import { api } from './api.js';

const NAV = [
  { key: 'ask',    label: 'Ask',    icon: askIcon },
  { key: 'trips',  label: 'Trips',  icon: tripsIcon },
  { key: 'cities', label: 'Cities', icon: cityIcon },
  { key: 'tools',  label: 'Tools',  icon: toolsIcon },
];

function highlightKey(active) {
  return active === 'plan' ? 'trips' : active;
}

let state = {
  active: 'ask',
  recent: [],   // [{ id, title, updated_at }]
  trip: null,   // { name, dates, ... }
  onNav: null,
};

export function mount({ container, onNav }) {
  state.onNav = onNav;
  render(container);
  loadRecent();
}

export function setActive(tab) {
  state.active = tab;
  rerender();
}

export function setRecent(list) {
  state.recent = list || [];
  rerender();
}

export function setTripContext(trip) {
  state.trip = trip;
  rerender();
}

function rerender() {
  const root = document.getElementById('sidebar');
  if (root) render(root);
}

function render(root) {
  root.innerHTML = '';

  // Wordmark
  const wm = document.createElement('div');
  wm.className = 'wordmark';
  wm.innerHTML = `<span class="dot"></span><span class="name">VisePanda</span>`;
  root.appendChild(wm);

  // New chat
  const nc = document.createElement('button');
  nc.className = 'sb-newchat';
  nc.type = 'button';
  nc.innerHTML = `<span style="font-size:14px;line-height:1">+</span><span>New chat</span>`;
  nc.addEventListener('click', () => {
    if (state.onNav) state.onNav('ask', { fresh: true });
  });
  root.appendChild(nc);

  // Nav
  const nav = document.createElement('nav');
  nav.className = 'sb-nav';
  const highlighted = highlightKey(state.active);
  for (const item of NAV) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'sb-nav-row' + (item.key === highlighted ? ' active' : '');
    row.innerHTML = `<span class="icon">${item.icon()}</span><span class="sb-label">${item.label}</span>`;
    row.addEventListener('click', () => {
      if (state.onNav) state.onNav(item.key);
    });
    nav.appendChild(row);
  }
  root.appendChild(nav);

  // Recent chats (only shown when on Ask)
  if (state.active === 'ask' || state.active === '') {
    const label = document.createElement('div');
    label.className = 'sb-section-label';
    label.textContent = 'RECENT CHATS';
    root.appendChild(label);

    const list = document.createElement('div');
    list.className = 'sb-recent';
    if (!state.recent.length) {
      const empty = document.createElement('div');
      empty.className = 'sb-recent-empty';
      empty.textContent = window.vp.user
        ? 'No chats yet.'
        : 'Sign in to save your history.';
      list.appendChild(empty);
    } else {
      for (const c of state.recent) {
        const it = document.createElement('button');
        it.className = 'sb-recent-item';
        it.type = 'button';
        it.innerHTML = `
          <span class="title">${esc(c.title || 'Untitled')}</span>
          <span class="meta">${formatWhen(c.updated_at)}</span>
        `;
        it.addEventListener('click', () => {
          if (state.onNav) state.onNav('ask', { session_id: c.id });
        });
        list.appendChild(it);
      }
    }
    root.appendChild(list);
  } else if (state.active === 'plan' && state.trip) {
    // Current trip card
    const card = document.createElement('div');
    card.className = 'sb-trip-card';
    card.innerHTML = `
      <div class="label">CURRENT TRIP</div>
      <div class="name">${esc(state.trip.name || 'Untitled trip')}</div>
      <div class="dates">${esc(state.trip.dates || '')}${
        state.trip.city_count ? ' · ' + state.trip.city_count + ' cities' : ''
      }</div>
    `;
    root.appendChild(card);
  } else {
    // Spacer to push account to bottom
    const sp = document.createElement('div');
    sp.style.flex = '1';
    root.appendChild(sp);
  }

  // Account
  const u = window.vp.user;
  const acct = document.createElement('button');
  acct.type = 'button';
  acct.className = 'sb-account';
  const initials = u
    ? (u.name || u.email || '?').trim()[0].toUpperCase()
    : '?';
  acct.innerHTML = `
    <span class="avatar">${initials}</span>
    <span class="sb-account-meta">${u ? esc(u.email || 'You') : 'Sign in'}</span>
    <span class="lang">EN ▾</span>
  `;
  acct.addEventListener('click', () => {
    if (state.onNav) state.onNav('account');
  });
  root.appendChild(acct);
}

async function loadRecent() {
  if (!window.vp.user) return;
  try {
    const data = await api.get('/api/chat-history');
    state.recent = (data.sessions || []).slice(0, 12);
    rerender();
  } catch (_) {}
}

function formatWhen(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (_) { return ''; }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// --------- Tab icons (SVG, follow wireframe shapes) ---------

function askIcon() {
  return `<svg viewBox="0 0 20 20" width="20" height="20" fill="none">
    <rect x="2" y="3" width="16" height="13" rx="3" fill="currentColor" opacity="0.85"/>
    <path d="M7 17l1.5 2 1.5-2" fill="currentColor" opacity="0.85"/>
  </svg>`;
}
function planIcon() {
  return `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="14" height="14" rx="2"/>
    <line x1="3" y1="8" x2="17" y2="8"/>
    <line x1="8" y1="3" x2="8" y2="17"/>
  </svg>`;
}
function cityIcon() {
  return `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="10" cy="8" r="6"/>
    <path d="M5 14l5 5 5-5" fill="currentColor" stroke="none"/>
  </svg>`;
}
function toolsIcon() {
  return `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="14" height="14" rx="2"/>
    <circle cx="10" cy="10" r="3"/>
  </svg>`;
}
function tripsIcon() {
  return `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="6" width="14" height="11" rx="2"/>
    <path d="M7 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
  </svg>`;
}
