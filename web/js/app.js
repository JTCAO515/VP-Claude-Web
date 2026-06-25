// VisePanda v8 — left sidebar + main router (Ask / Trips(+Plan) / Cities / Tools).
// Plan and Trips were merged into one tab: Trips shows the saved-trip list;
// opening or creating a trip switches the same tab into the Plan-style
// itinerary builder, with a "← All trips" link back to the list.

import { api } from './api.js';
import * as sidebar from './sidebar.js';
import * as topbar from './topbar.js';
import * as ask from './ask.js';
import * as plan from './plan.js';
import * as cities from './cities.js';
import * as tools from './tools.js';
import * as trips from './trips.js';
import * as auth from './auth.js';

window.vp = window.vp || {};
window.vp.features = {
  has_deepseek: false,
  has_voice: false,
  has_supabase: false,
  has_email: false,
  has_google: false,
  has_map: false,
  amap_key: '',
  amap_security: '',
};
window.vp.user = null;

const VIEWS = ['ask', 'plan', 'cities', 'tools', 'trips'];

async function boot() {
  try {
    const data = await api.get('/api/config/public');
    window.vp.features = { ...window.vp.features, ...data };
  } catch (_) {}
  try {
    const data = await api.get('/api/auth/profile');
    if (data && data.user) window.vp.user = data.user;
  } catch (_) {}

  sidebar.mount({
    container: document.getElementById('sidebar'),
    onNav: handleNav,
  });
  topbar.mount({
    container: document.getElementById('topbar'),
    onNav: handleNav,
    onToggleSidebar: () => {
      document.querySelector('.shell').classList.toggle('sidebar-collapsed');
    },
  });

  setView('ask');

  window.addEventListener('vp:auth-required', () => auth.openSignIn());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function handleNav(key, opts = {}) {
  if (key === 'account') {
    auth.openAccount();
    return;
  }
  if (VIEWS.includes(key)) setView(key, opts);
}

function setView(name, opts = {}) {
  sidebar.setActive(name);
  topbar.setActive(name);
  const main = document.getElementById('main');
  main.innerHTML = '';
  main.className = 'main';
  if (name === 'ask') {
    ask.mount({
      container: main,
      sessionId: opts.session_id || null,
      freshChat: !!opts.fresh,
      onAddToTrip: (note) => {
        alert('Added to trip: ' + note.slice(0, 80) + (note.length > 80 ? '…' : ''));
      },
    });
  } else if (name === 'plan') {
    plan.mount({
      container: main,
      tripId: opts.tripId || null,
      onBackToTrips: () => setView('trips'),
    });
  } else if (name === 'cities') {
    cities.mount({
      container: main,
      onAddToPlan: (city) => {
        // Jump to Plan (scratch mode) with this city seeded as a destination.
        try {
          const meta = JSON.parse(localStorage.getItem('vp.plan.meta') || '{}');
          const dests = meta.destinations || [];
          if (!dests.find((d) => d.id === city.id)) {
            dests.push({ id: city.id, name: city.name, cn: city.cn });
          }
          localStorage.setItem('vp.plan.meta', JSON.stringify({ ...meta, destinations: dests }));
        } catch (_) {}
        setView('plan', {});
      },
    });
  } else if (name === 'tools') {
    tools.mount({
      container: main,
      onAsk: () => setView('ask', { fresh: true }),
    });
  } else if (name === 'trips') {
    trips.mount({
      container: main,
      onOpenTrip: (tripId) => setView('plan', { tripId }),
    });
  }
}

boot();
