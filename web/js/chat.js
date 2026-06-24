// Chat view — vertical 你好 hero, conversation log, follow-ups, compose.
import { api } from './api.js';
import { chop } from './components/chop.js';

const SUGGESTIONS = [
  { icon: '💳', label: 'Payment',    q: 'How do I set up Alipay TourCard as a foreigner?' },
  { icon: '🚄', label: 'Transport',  q: 'How do I take the high-speed rail with my passport?' },
  { icon: '🏯', label: 'Itinerary',  q: 'Which Chinese cities are worth 10 days?' },
  { icon: '🏨', label: 'Stay',       q: 'Best foreigner-friendly hotels in Beijing?' },
  { icon: '📶', label: 'Connectivity', q: 'eSIM or local SIM — which should I get on arrival?' },
  { icon: '🍜', label: 'Food',       q: 'How do I order food if I can\'t read the menu?' },
];

let state = {
  messages: [],
  sessionId: null,
  thinking: false,
  root: null,
};

export function mount(container) {
  state.root = container;
  render();
}

function render() {
  if (!state.root) return;
  state.root.innerHTML = '';
  if (state.messages.length === 0) renderEmpty();
  else renderLog();
  renderCompose();
}

function renderEmpty() {
  const wrap = document.createElement('section');
  wrap.className = 'chat-empty';
  wrap.innerHTML = `
    <div class="chat-hero">
      <div class="vertical-greeting"><span>你</span><span>好</span></div>
      <p class="tagline">
        What can I help you with in China?
        <span class="py">nǐ hǎo · hello</span>
      </p>
    </div>
    <ul class="suggestions"></ul>
    ${!window.vp.user ? `
      <div class="chat-empty-note">
        <span class="why">Browsing as a guest</span>
        Chat works without an account. Sign in to keep your history across devices.
      </div>` : ''}
  `;
  const list = wrap.querySelector('.suggestions');
  for (const s of SUGGESTIONS) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'suggestion';
    btn.innerHTML = `
      <span class="s-icon">${s.icon}</span>
      <span class="s-body">
        <span class="s-label">${s.label}</span>
        <span class="s-q">${esc(s.q)}</span>
      </span>
    `;
    btn.addEventListener('click', () => send(s.q));
    li.appendChild(btn);
    list.appendChild(li);
  }
  state.root.appendChild(wrap);
}

function renderLog() {
  const log = document.createElement('ol');
  log.className = 'chat-log';
  log.id = 'chat-log';
  for (let i = 0; i < state.messages.length; i++) {
    log.appendChild(renderMessage(state.messages[i], i));
  }
  if (state.thinking) {
    const t = document.createElement('li');
    t.className = 'msg msg-ai';
    const inner = document.createElement('div');
    inner.className = 'bubble thinking';
    inner.innerHTML = `
      <span class="thinking-label">VisePanda is thinking</span>
      <span class="thinking-dot">•</span>
      <span class="thinking-dot">•</span>
      <span class="thinking-dot">•</span>
    `;
    inner.appendChild(chop('问', { size: 'sm' }));
    t.appendChild(inner);
    log.appendChild(t);
  }
  state.root.appendChild(log);
  requestAnimationFrame(() => log.scrollIntoView({ block: 'end', behavior: 'smooth' }));
}

function renderMessage(msg, i) {
  const li = document.createElement('li');
  li.className = 'msg msg-' + msg.role;
  const bubble = document.createElement('div');
  bubble.className = 'bubble' + (msg.error ? ' error' : '');
  bubble.textContent = msg.content;
  if (msg.role === 'ai') bubble.appendChild(chop('问', { size: 'sm', animate: true }));
  li.appendChild(bubble);
  if (msg.error && msg.retryFor) {
    const retry = document.createElement('button');
    retry.className = 'btn-outline retry-btn';
    retry.textContent = '↻ Retry';
    retry.addEventListener('click', () => {
      state.messages = state.messages.slice(0, i);
      render();
      send(msg.retryFor);
    });
    const row = document.createElement('div');
    row.className = 'followups';
    row.appendChild(retry);
    li.appendChild(row);
  } else if (msg.role === 'ai' && Array.isArray(msg.follow_ups) && msg.follow_ups.length) {
    const fwrap = document.createElement('div');
    fwrap.className = 'followups';
    for (const q of msg.follow_ups) {
      const c = document.createElement('button');
      c.className = 'chip';
      c.textContent = q;
      c.addEventListener('click', () => send(q));
      fwrap.appendChild(c);
    }
    li.appendChild(fwrap);
  }
  return li;
}

function renderCompose() {
  const wrap = document.createElement('div');
  wrap.className = 'chat-compose';
  wrap.innerHTML = `
    <form class="compose-form" id="compose-form">
      <textarea id="chat-input" placeholder="Ask anything about traveling in China…" rows="1"></textarea>
      <button class="send" type="submit" aria-label="Send">→</button>
    </form>
  `;
  state.root.appendChild(wrap);
  const ta = wrap.querySelector('textarea');
  const form = wrap.querySelector('form');
  // Restore draft
  const draft = localStorage.getItem('vp.chat.draft') || '';
  ta.value = draft;
  autosize(ta);
  ta.addEventListener('input', () => {
    autosize(ta);
    localStorage.setItem('vp.chat.draft', ta.value);
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = ta.value.trim();
    if (!v || state.thinking) return;
    ta.value = '';
    localStorage.removeItem('vp.chat.draft');
    autosize(ta);
    send(v);
  });
  ta.focus();
}

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 9 * 16) + 'px';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
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
      message,
      history,
      session_id: state.sessionId,
    });
    state.sessionId = res.session_id || state.sessionId;
    state.messages.push({
      role: 'ai',
      content: res.reply || '',
      follow_ups: res.follow_ups || [],
      provider: res.provider,
    });
  } catch (e) {
    state.messages.push({
      role: 'ai',
      content: e?.code === 'network'
        ? 'No network connection. Check your Wi-Fi or VPN and retry.'
        : 'Reaching the server failed. Tap retry to try again.',
      follow_ups: [],
      error: true,
      retryFor: message,
    });
  } finally {
    state.thinking = false;
    render();
  }
}

export function reset() {
  state.messages = [];
  state.sessionId = null;
  state.thinking = false;
  render();
}
