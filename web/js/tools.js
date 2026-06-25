// Tools view — categorized utility cards. Pulls from /api/tools but layers
// extra "essentials" the wireframe shows (currency, translate, visa) on top.

import { api } from './api.js';
import { openTranslatePanel } from './components/translate-panel.js';
import { openHotelBooking, openTransportBooking, openDealsBooking } from './components/booking-panel.js';

const ESSENTIALS = [
  { id: 'currency',  name: 'Currency converter', desc: 'Live CNY ↔ USD/EUR/GBP and offline cheat sheets.', ico: '¥' },
  { id: 'translate', name: 'Translate & scan',   desc: 'On-the-ground translation by voice, text, or camera.', ico: '⇄' },
  { id: 'payment',   name: 'Payment setup',      desc: 'Alipay TourCard, WeChat Pay, and foreign-card tips.', ico: '◉' },
  { id: 'visa',      name: 'Visa & entry',       desc: 'Visa-free countries, port-of-entry rules, transit visas.', ico: '✓' },
];
const GROUND = [
  { id: 'metro',     name: 'Metro maps',         desc: 'Beijing · Shanghai · Chengdu · 12 more cities.', ico: 'M' },
  { id: 'sim',       name: 'eSIM & VPN',         desc: 'What to install before you board; what to skip.', ico: '◑' },
  { id: 'phrases',   name: 'Phrases & etiquette', desc: 'Taxi, hotel, food, emergency — with audio.', ico: '语' },
  { id: 'emergency', name: 'Emergency / SOS',    desc: 'Embassy contacts, hospital finder, lost passport flow.', ico: '!', tone: 'sos' },
];
const BOOKING = [
  { id: 'book-hotel',     name: 'Hotels',      desc: 'Search and book via Trip.com (携程), with ratings.', ico: '🏨' },
  { id: 'book-transport', name: 'Transport',   desc: 'Trains and flights via Trip.com (携程).', ico: '🚄' },
  { id: 'book-deals',     name: 'Group deals', desc: 'Dining & experience deals via Meituan (美团).', ico: '🏷️' },
];

let state = { root: null, onAsk: null };

export function mount({ container, onAsk }) {
  state.root = container;
  state.onAsk = onAsk;
  container.classList.add('view-tools');
  render();
}

function render() {
  if (!state.root) return;
  state.root.innerHTML = `
    <section class="tools-toolbar">
      <div class="title">Travel tools</div>
      <div class="search">
        <span class="glyph"></span>
        <input type="search" placeholder="Search tools…">
      </div>
    </section>
    <section class="tools-body">
      <div class="tools-section-label">ESSENTIALS</div>
      <div class="tools-grid" id="tools-essentials"></div>
      <div class="tools-section-label" style="margin-top:22px">GETTING AROUND</div>
      <div class="tools-grid" id="tools-ground"></div>
      <div class="tools-section-label" style="margin-top:22px">BOOK &amp; REVIEWS</div>
      <div class="tools-grid" id="tools-booking"></div>
      <div class="tools-ai-strip">
        <span class="panda-mini"></span>
        <div class="text">
          <h4>Can't find what you need?</h4>
          <p>Ask Panda anything in plain English.</p>
        </div>
        <button class="ask-btn" type="button">Ask Panda</button>
      </div>
    </section>
  `;
  paint('tools-essentials', ESSENTIALS);
  paint('tools-ground',     GROUND);
  paint('tools-booking',    BOOKING);
  state.root.querySelector('.ask-btn').addEventListener('click', () => {
    if (state.onAsk) state.onAsk();
  });
}

function paint(id, items) {
  const root = state.root.querySelector('#' + id);
  for (const t of items) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'tool-card' + (t.tone === 'sos' ? ' sos' : '');
    card.innerHTML = `
      <div class="ico">${esc(t.ico || '·')}</div>
      <div class="name">${esc(t.name)}</div>
      <div class="desc">${esc(t.desc)}</div>
      <div class="open">Open →</div>
    `;
    card.addEventListener('click', () => openTool(t));
    root.appendChild(card);
  }
}

async function openTool(t) {
  if (t.id === 'translate') { openTranslatePanel(); return; }
  if (t.id === 'book-hotel') { openHotelBooking(); return; }
  if (t.id === 'book-transport') { openTransportBooking(); return; }
  if (t.id === 'book-deals') { openDealsBooking(); return; }
  try {
    const data = await api.get('/api/tools?id=' + encodeURIComponent(t.id));
    if (data.ok && data.tool) {
      const steps = (data.tool.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
      alert(`${data.tool.title}\n\n${data.tool.summary}\n\n${steps}`);
      return;
    }
  } catch (_) {}
  alert(`${t.name}\n\n${t.desc}\n\n(Full tool detail view coming soon.)`);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
