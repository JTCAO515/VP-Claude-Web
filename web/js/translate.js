// Translate modal — hero card, voice, phrase chips, history, fullscreen "show driver".
import { api } from './api.js';
import { chop } from './components/chop.js';
import * as voice from './voice.js';

const PHRASE_CATEGORIES = [
  { key: 'phrases',     label: 'Common', icon: '💬' },
  { key: 'dining',      label: 'Food',   icon: '🍜' },
  { key: 'attractions', label: 'Sights', icon: '🏯' },
  { key: 'culture',     label: 'Etiquette', icon: '🙏' },
];

let state = {
  open: false,
  direction: 'en->zh',
  current: null,   // { source, target, pinyin, note, direction }
  history: [],     // recent translations
  recording: null, // { stop } handle
  phrasesCache: {},
  expandedCategory: null,
};

const $modal = () => document.getElementById('view-translate');
const $backdrop = () => document.getElementById('modal-backdrop');

export function open() {
  state.open = true;
  render();
  const m = $modal(); const b = $backdrop();
  m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  b.hidden = false; requestAnimationFrame(() => b.classList.add('open'));
  b.onclick = close;
}

export function close() {
  state.open = false;
  document.body.classList.remove('translate-full');
  if (state.recording) { state.recording.stop(); state.recording = null; }
  voice.stop();
  const m = $modal(); const b = $backdrop();
  m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
  b.classList.remove('open');
  setTimeout(() => { b.hidden = true; }, 200);
}

function render() {
  const m = $modal();
  m.innerHTML = `
    <header class="translate-bar">
      <button class="close" id="tr-close" aria-label="Close">✕</button>
      <span class="chop">译</span>
    </header>
    <div class="translate-body">
      <div id="tr-hero"></div>
      <div class="direction-toggle">
        <span>${state.direction === 'en->zh' ? 'English → 中文' : '中文 → English'}</span>
        <button id="tr-swap">⇄ swap</button>
      </div>
      <form class="translate-compose" id="tr-form">
        <textarea id="tr-input" rows="1" placeholder="${
          state.direction === 'en->zh' ? 'Type English to translate…' : '输入中文进行翻译…'
        }"></textarea>
        <button type="button" class="icon-btn mic" id="tr-mic" aria-label="Record">🎤</button>
        <button type="submit" class="icon-btn send" aria-label="Translate">→</button>
      </form>
      <div class="phrase-chips" id="tr-chips"></div>
      <div class="phrase-list" id="tr-list" hidden></div>
      <div class="history-stack" id="tr-history"></div>
    </div>
    <div class="exit-full-hint">Tap to exit</div>
  `;
  m.querySelector('#tr-close').addEventListener('click', close);
  m.querySelector('#tr-swap').addEventListener('click', () => {
    state.direction = state.direction === 'en->zh' ? 'zh->en' : 'en->zh';
    render();
  });
  const form = m.querySelector('#tr-form');
  const ta = m.querySelector('#tr-input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = ta.value.trim();
    if (!v) return;
    ta.value = '';
    submit(v);
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    if (e.key === 'Escape') close();
  });
  m.querySelector('#tr-mic').addEventListener('click', toggleMic);
  renderChips();
  renderHero();
  renderHistory();
  ta.focus();
}

function renderHero() {
  const root = document.getElementById('tr-hero');
  if (!root) return;
  if (!state.current) {
    root.innerHTML = `
      <div class="translate-empty">
        Type or speak to translate.
        <span class="py">Tap the result to enlarge it for a driver or vendor.</span>
      </div>
    `;
    return;
  }
  const t = state.current;
  root.innerHTML = `
    <div class="hero-card" id="tr-hero-card">
      <span class="chop card-chop sm">译</span>
      <div class="en-line">${esc(t.direction === 'en->zh' ? t.source : t.target)}</div>
      <div class="zh-line">${esc(t.direction === 'en->zh' ? t.target : t.source)}</div>
      ${t.pinyin ? `<div class="py-line">${esc(t.pinyin)}</div>` : ''}
      ${t.note ? `<div class="note-line">${esc(t.note)}</div>` : ''}
      <div class="actions">
        <button class="action-btn" id="tr-play" type="button">▶ Play CN</button>
        <button class="action-btn primary" id="tr-full" type="button">⤢ Show driver</button>
        <button class="action-btn" id="tr-save" type="button">♥ Save</button>
      </div>
    </div>
  `;
  root.querySelector('#tr-play').addEventListener('click', () => {
    voice.play(t.direction === 'en->zh' ? t.target : t.source);
  });
  root.querySelector('#tr-full').addEventListener('click', enterFullscreen);
  root.querySelector('#tr-save').addEventListener('click', save);
}

function renderChips() {
  const root = document.getElementById('tr-chips');
  if (!root) return;
  root.innerHTML = '';
  for (const cat of PHRASE_CATEGORIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (state.expandedCategory === cat.key ? ' active' : '');
    btn.innerHTML = `<span>${cat.icon}</span> ${cat.label}`;
    btn.addEventListener('click', () => toggleCategory(cat.key));
    root.appendChild(btn);
  }
}

async function toggleCategory(key) {
  if (state.expandedCategory === key) {
    state.expandedCategory = null;
    document.getElementById('tr-list').hidden = true;
    renderChips();
    return;
  }
  state.expandedCategory = key;
  renderChips();
  if (!state.phrasesCache[key]) {
    try {
      const data = await api.get('/api/translations/' + key);
      state.phrasesCache[key] = Array.isArray(data.phrases) ? data.phrases : (data.items || []);
    } catch (_) {
      state.phrasesCache[key] = [];
    }
  }
  const list = document.getElementById('tr-list');
  list.hidden = false;
  list.innerHTML = '';
  for (const p of state.phrasesCache[key]) {
    const en = p.english || p.en || p.title || '';
    const zh = p.chinese || p.zh || p.cn || '';
    const py = p.pinyin || p.py || '';
    if (!en && !zh) continue;
    const div = document.createElement('button');
    div.type = 'button';
    div.className = 'phrase-item';
    div.innerHTML = `<span class="en">${esc(en)}</span><span class="zh">${esc(zh)}${py ? ` <i style="color:var(--stone-gray)">· ${esc(py)}</i>` : ''}</span>`;
    div.addEventListener('click', () => {
      state.current = {
        source: en, target: zh, pinyin: py,
        note: p.use || null, direction: 'en->zh',
      };
      renderHero();
      voice.play(zh);
    });
    list.appendChild(div);
  }
}

function renderHistory() {
  const root = document.getElementById('tr-history');
  if (!root) return;
  root.innerHTML = '';
  if (state.history.length <= 1) return;
  for (let i = 1; i < Math.min(state.history.length, 6); i++) {
    const t = state.history[i];
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'history-item';
    const en = t.direction === 'en->zh' ? t.source : t.target;
    const zh = t.direction === 'en->zh' ? t.target : t.source;
    item.innerHTML = `<span class="en">${esc(en)}</span><span class="zh">${esc(zh)}</span>`;
    item.addEventListener('click', () => {
      state.current = t;
      renderHero();
    });
    root.appendChild(item);
  }
}

async function submit(text) {
  // Optimistic skeleton
  state.current = { source: text, target: '…', pinyin: null,
                    note: null, direction: state.direction };
  renderHero();
  try {
    const res = await api.post('/api/translate', { text, direction: state.direction });
    const next = {
      source: res.source || text,
      target: res.target || '',
      pinyin: res.pinyin || null,
      note: res.note || null,
      direction: state.direction,
    };
    state.current = next;
    state.history.unshift(next);
    state.history = state.history.slice(0, 12);
    renderHero();
    renderHistory();
    // Auto-play the target (the side the listener doesn't speak natively).
    voice.play(state.direction === 'en->zh' ? next.target : next.source);
  } catch (e) {
    state.current = {
      source: text, target: 'Translation unavailable',
      pinyin: null,
      note: 'Try again in a moment.',
      direction: state.direction,
    };
    renderHero();
  }
}

function toggleMic() {
  const btn = document.getElementById('tr-mic');
  if (state.recording) {
    state.recording.stop();
    state.recording = null;
    btn.classList.remove('recording');
    return;
  }
  btn.classList.add('recording');
  state.recording = voice.record({
    onResult: ({ text }) => {
      btn.classList.remove('recording');
      state.recording = null;
      if (text) submit(text);
    },
    onError: () => {
      btn.classList.remove('recording');
      state.recording = null;
    },
  });
  // Auto-stop after 8s safety.
  setTimeout(() => {
    if (state.recording) { state.recording.stop(); state.recording = null; btn.classList.remove('recording'); }
  }, 8000);
}

function enterFullscreen() {
  document.body.classList.add('translate-full');
  const exit = () => {
    document.body.classList.remove('translate-full');
    document.removeEventListener('click', onClick, true);
  };
  const onClick = (e) => {
    // Only exit if click is on the hero card itself or the exit hint
    if (e.target.closest('.exit-full-hint') || e.target.closest('.hero-card')) {
      exit();
    }
  };
  setTimeout(() => document.addEventListener('click', onClick, true), 100);
  if (navigator.wakeLock && navigator.wakeLock.request) {
    navigator.wakeLock.request('screen').catch(() => {});
  }
}

async function save() {
  if (!state.current) return;
  if (!window.vp.user) {
    window.dispatchEvent(new CustomEvent('vp:auth-required'));
    return;
  }
  try {
    await api.post('/api/favorites', {
      kind: 'translation',
      ref_id: hashRef(state.current),
      payload: state.current,
    });
    flashSave();
  } catch (_) { /* swallow */ }
}

function hashRef(t) {
  return (t.direction + '|' + t.source).slice(0, 240);
}

function flashSave() {
  const btn = document.getElementById('tr-save');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '✓ Saved';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
