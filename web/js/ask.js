// Ask view — landing (panda + suggestions + input) AND active conversation
// (user / AI bubbles + follow-up chips + input).
//
// Mounts into a container. Uses /api/chat, persists session when authed.

import { api } from './api.js';

const SUGGESTIONS = [
  { icon: tripIconSvg(), label: 'Plan my Itinerary',
    q: 'Plan a 10-day China itinerary covering Beijing, Xi\'an, and Chengdu for a first-time visitor.' },
  { icon: pinIconSvg(), label: 'Explore Cities',
    q: 'Which Chinese cities should I visit for my first trip?' },
  { icon: toolsIconSvg(), label: 'Essential Tools',
    q: 'How do I set up payments and a SIM card as a foreigner in China?' },
  { icon: bookingIconSvg(), label: 'My Bookings',
    q: 'I have 5 days in Shanghai — what should I do?' },
];

function tripIconSvg() {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8.5 14.5l1.5 1.5 3-3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function pinIconSvg() {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>`;
}
function toolsIconSvg() {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14.7 6.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-.5.27l-2.7.6.6-2.7a1 1 0 0 1 .27-.5z"/><path d="M5 19h5" stroke-linecap="round"/></svg>`;
}
function bookingIconSvg() {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><path d="M8 14l1.6 1.6L14 11.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

let state = {
  root: null,
  messages: [],
  sessionId: null,
  thinking: false,
  onAddToTrip: null,
};

export function mount({ container, sessionId = null, freshChat = false, onAddToTrip = null }) {
  state.root = container;
  state.onAddToTrip = onAddToTrip;
  container.classList.add('view-ask');
  if (freshChat) {
    state.messages = [];
    state.sessionId = null;
    render();
    return;
  }
  if (sessionId && sessionId !== state.sessionId) {
    state.sessionId = sessionId;
    loadSession(sessionId);
    return;
  }
  render();
}

async function loadSession(sid) {
  state.messages = [{ role: 'ai', content: 'Loading conversation…', _loading: true }];
  render();
  try {
    const data = await api.get('/api/chat-history/' + sid);
    state.messages = (data.messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'ai' : 'user',
      content: m.content || '',
    }));
    render();
  } catch (_) {
    state.messages = [];
    render();
  }
}

function render() {
  if (!state.root) return;
  state.root.innerHTML = '';
  if (state.messages.length === 0) renderEmpty();
  else renderConversation();
  renderCompose();
}

function renderEmpty() {
  const wrap = document.createElement('section');
  wrap.className = 'ask-empty';
  wrap.innerHTML = `
    <div class="panda-mark">
      <svg width="56" height="56" viewBox="0 0 52 52" aria-hidden="true">
        <rect width="52" height="52" rx="16" fill="#a23728"/>
        <circle cx="18" cy="18" r="7" fill="#2e2620"/>
        <circle cx="34" cy="18" r="7" fill="#2e2620"/>
        <circle cx="18" cy="18" r="4" fill="#fff"/>
        <circle cx="34" cy="18" r="4" fill="#fff"/>
        <ellipse cx="26" cy="30" rx="10" ry="8" fill="#fff"/>
        <circle cx="23" cy="28" r="2" fill="#2e2620"/>
        <circle cx="29" cy="28" r="2" fill="#2e2620"/>
        <ellipse cx="26" cy="32" rx="3" ry="2" fill="#2e2620" opacity="0.3"/>
      </svg>
      <svg class="cloud" width="36" height="20" viewBox="0 0 36 20" aria-hidden="true">
        <path d="M6 16a6 6 0 0 1 6-6 5 5 0 0 1 5-5 6 6 0 0 1 11 2 5 5 0 0 1 4 5 4 4 0 0 1-1 8H6a4 4 0 0 1 0-4z" fill="#2e2620"/>
      </svg>
    </div>
    <h1>What can I help you plan?</h1>
    <div class="zh">你好！欢迎来中国</div>
    <div class="ask-suggestions"></div>
  `;
  const grid = wrap.querySelector('.ask-suggestions');
  for (const s of SUGGESTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ask-suggestion';
    btn.innerHTML = `<span class="sug-icon">${s.icon}</span><span class="sug-label">${esc(s.label)}</span>`;
    btn.addEventListener('click', () => send(s.q));
    grid.appendChild(btn);
  }
  state.root.appendChild(wrap);
}

function renderConversation() {
  const wrap = document.createElement('div');
  wrap.className = 'ask-conversation';

  for (let i = 0; i < state.messages.length; i++) {
    wrap.appendChild(renderMessage(state.messages[i], i));
  }
  if (state.thinking) {
    const t = document.createElement('div');
    t.className = 'ask-msg-ai ask-thinking';
    t.innerHTML = `
      <div class="ai-avatar"></div>
      <div class="ai-body">
        <div class="bubble">
          <span>Panda is thinking</span>
          <span class="thinking-dot">•</span>
          <span class="thinking-dot">•</span>
          <span class="thinking-dot">•</span>
        </div>
      </div>
    `;
    wrap.appendChild(t);
  }
  state.root.appendChild(wrap);

  // Render follow-up chips if last AI message has any
  const lastAi = [...state.messages].reverse().find((m) => m.role === 'ai');
  if (lastAi && Array.isArray(lastAi.follow_ups) && lastAi.follow_ups.length) {
    const chips = document.createElement('div');
    chips.className = 'ask-chips';
    for (const q of lastAi.follow_ups.slice(0, 3)) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'ask-chip';
      c.textContent = q;
      c.addEventListener('click', () => send(q));
      chips.appendChild(c);
    }
    state.root.appendChild(chips);
  }

  requestAnimationFrame(() => {
    wrap.scrollTop = wrap.scrollHeight;
  });
}

function renderMessage(msg, i) {
  if (msg.role === 'user') {
    const el = document.createElement('div');
    el.className = 'ask-msg-user';
    el.textContent = msg.content;
    return el;
  }
  const el = document.createElement('div');
  el.className = 'ask-msg-ai' + (msg.error ? ' error' : '');
  const body = document.createElement('div');
  body.className = 'ai-body';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = msg.content;
  body.appendChild(bubble);

  if (msg.error && msg.retryFor) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '↻ Retry';
    retry.addEventListener('click', () => {
      state.messages = state.messages.slice(0, i);
      render();
      send(msg.retryFor);
    });
    actions.appendChild(retry);
    body.appendChild(actions);
  } else if (!msg._loading) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    const regen = button('↻ Regenerate', () => {
      // re-ask the prior user message
      const prevUser = [...state.messages.slice(0, i)].reverse().find((m) => m.role === 'user');
      if (!prevUser) return;
      state.messages = state.messages.slice(0, i);
      render();
      send(prevUser.content);
    });
    const add = button('＋ Add to Trip', () => {
      if (state.onAddToTrip) state.onAddToTrip(msg.content);
    });
    add.className = 'add-to-trip';
    const copy = button('⧉ Copy', async () => {
      try { await navigator.clipboard.writeText(msg.content); } catch (_) {}
    });
    actions.appendChild(regen);
    actions.appendChild(add);
    actions.appendChild(copy);
    body.appendChild(actions);
  }

  el.innerHTML = `<div class="ai-avatar"></div>`;
  el.appendChild(body);
  return el;
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function renderCompose() {
  const wrap = document.createElement('form');
  wrap.className = 'ask-compose';
  wrap.innerHTML = `
    <div class="input-wrap">
      <textarea rows="1" placeholder="${
        state.messages.length === 0
          ? 'Ask anything about China travel…'
          : 'Ask a follow-up…'
      }"></textarea>
    </div>
    <button type="submit" class="send" aria-label="Send">↑</button>
  `;
  const ta = wrap.querySelector('textarea');
  const draftKey = 'vp.ask.draft';
  ta.value = localStorage.getItem(draftKey) || '';
  autosize(ta);
  ta.addEventListener('input', () => {
    autosize(ta);
    localStorage.setItem(draftKey, ta.value);
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      wrap.requestSubmit();
    }
  });
  wrap.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = ta.value.trim();
    if (!v || state.thinking) return;
    ta.value = '';
    localStorage.removeItem(draftKey);
    autosize(ta);
    send(v);
  });
  state.root.appendChild(wrap);
  if (state.messages.length > 0) ta.focus();
}

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 9 * 16) + 'px';
}

async function send(message) {
  state.messages.push({ role: 'user', content: message });
  state.thinking = true;
  render();
  try {
    const history = state.messages.slice(0, -1).map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));
    const res = await api.post('/api/chat', {
      message, history, session_id: state.sessionId,
    });
    state.sessionId = res.session_id || state.sessionId;
    state.messages.push({
      role: 'ai',
      content: res.reply || '',
      follow_ups: res.follow_ups || [],
    });
  } catch (e) {
    state.messages.push({
      role: 'ai',
      content: e?.code === 'network'
        ? 'No network connection. Check your Wi-Fi or VPN and retry.'
        : 'Reaching the server failed. Tap retry.',
      follow_ups: [],
      error: true,
      retryFor: message,
    });
  } finally {
    state.thinking = false;
    render();
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
