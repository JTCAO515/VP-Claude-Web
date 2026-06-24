// VisePanda v7 — single-page bootstrap.
// Loads features + current user, wires header + FAB, mounts chat.

import { api } from './api.js';
import * as chat from './chat.js';
import * as dashboard from './dashboard.js';
import * as translate from './translate.js';
import * as auth from './auth.js';

window.vp = window.vp || {};
window.vp.features = {
  has_deepseek: false,
  has_voice: false,
  has_supabase: false,
  has_email: false,
  has_google: false,
};
window.vp.user = null;
window.vp.city = localStorage.getItem('vp.city') || 'beijing';

async function boot() {
  // 1) Feature flags first (informs UI affordances).
  try {
    const data = await api.get('/api/config/public');
    window.vp.features = { ...window.vp.features, ...data };
  } catch (_) { /* keep defaults */ }

  // 2) Resolve session if any. Profile returns {user: null} when not signed in
  //    (rather than 401), so no try/catch is needed for the common case.
  try {
    const data = await api.get('/api/auth/profile');
    if (data && data.user) window.vp.user = data.user;
  } catch (_) { /* network down; stay unauthed */ }

  // 3) Mount chat (the home screen).
  chat.mount(document.getElementById('view-chat'));

  // 4) Wire chrome.
  document.getElementById('open-dashboard').addEventListener('click', () => dashboard.open());
  document.getElementById('open-account').addEventListener('click', () => auth.openAccount());
  const fab = document.getElementById('fab-translate');
  fab.addEventListener('click', () => translate.open());
  // First-load intro animation (only first session)
  if (!sessionStorage.getItem('vp.fab.seen')) {
    fab.classList.add('intro');
    sessionStorage.setItem('vp.fab.seen', '1');
    setTimeout(() => fab.classList.remove('intro'), 10000);
  }

  window.addEventListener('vp:auth-required', () => auth.openSignIn());

  // 5) Service worker (best effort).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

boot();
