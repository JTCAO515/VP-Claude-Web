// Sidebar — collapse handle, + New chat, Recent Conversations list, Current
// trip card (shown while inside the Plan builder, a sub-view of Trips —
// see app.js), account row pinned to the bottom (avatar + name).
//
// The four primary views (Ask/Trips/Explore/Tools) live in the topbar now
// (see topbar.js) — this sidebar is purely a conversation-history rail.
//
// Renders into #sidebar. Exposes setActive(tab), setRecent(), setTripContext().

import { api } from './api.js';

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

  // Collapse handle (top-left, mirrors the topbar toggle for discoverability)
  const collapseRow = document.createElement('div');
  collapseRow.className = 'sb-collapse-row';
  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'sb-menu-btn';
  menuBtn.setAttribute('aria-label', 'Menu');
  menuBtn.innerHTML = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h14M3 10h14M3 14h14" stroke-linecap="round"/></svg>`;
  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'sb-collapse-btn';
  collapseBtn.setAttribute('aria-label', 'Collapse sidebar');
  collapseBtn.innerHTML = `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4l-6 6 6 6M14 4l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  collapseBtn.addEventListener('click', () => {
    document.querySelector('.shell')?.classList.add('sidebar-collapsed');
  });
  collapseRow.appendChild(menuBtn);
  collapseRow.appendChild(collapseBtn);
  root.appendChild(collapseRow);

  // New chat
  const nc = document.createElement('button');
  nc.className = 'sb-newchat';
  nc.type = 'button';
  nc.innerHTML = `<span style="font-size:14px;line-height:1">+</span><span>New chat</span>`;
  nc.addEventListener('click', () => {
    if (state.onNav) state.onNav('ask', { fresh: true });
  });
  root.appendChild(nc);

  // Recent conversations — the sidebar's main job now that the four
  // primary views live in the topbar. Shown regardless of active view
  // so it's always one click away.
  {
    const label = document.createElement('div');
    label.className = 'sb-section-label';
    label.textContent = 'Recent Conversations';
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
  }

  if (state.active === 'plan' && state.trip) {
    // Current trip card — shown above the account row while inside the
    // Plan builder, regardless of the recent-conversations list above.
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
  }

  // Account — pinned to the bottom via CSS (margin-top: auto)
  const u = window.vp.user;
  const acct = document.createElement('button');
  acct.type = 'button';
  acct.className = 'sb-account';
  const initials = u
    ? (u.name || u.email || '?').trim()[0].toUpperCase()
    : '?';
  acct.innerHTML = `
    <span class="avatar">${initials}</span>
    <span class="sb-account-meta">${u ? esc(u.name || u.email || 'You') : 'Sign in'}</span>
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
