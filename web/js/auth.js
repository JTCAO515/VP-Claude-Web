// Auth — bottom sheet for sign-in/register, verify, and profile menu.
import { api } from './api.js';

let state = {
  view: 'signin',   // 'signin' | 'verify' | 'account'
  email: '',
  error: null,
};

const $sheet = () => document.getElementById('view-auth');
const $back = () => document.getElementById('sheet-backdrop');

export function openSignIn() {
  state.view = 'signin';
  state.error = null;
  render();
  show();
}

export function openAccount() {
  if (window.vp.user) {
    state.view = 'account';
  } else {
    state.view = 'signin';
  }
  state.error = null;
  render();
  show();
}

function show() {
  const s = $sheet(); const b = $back();
  s.classList.add('open'); s.setAttribute('aria-hidden', 'false');
  b.hidden = false; requestAnimationFrame(() => b.classList.add('open'));
  b.onclick = close;
}

export function close() {
  const s = $sheet(); const b = $back();
  s.classList.remove('open'); s.setAttribute('aria-hidden', 'true');
  b.classList.remove('open');
  setTimeout(() => { b.hidden = true; }, 200);
}

function render() {
  const s = $sheet();
  if (state.view === 'signin') s.innerHTML = signinHTML();
  else if (state.view === 'verify') s.innerHTML = verifyHTML();
  else if (state.view === 'account') s.innerHTML = accountHTML();
  attach();
}

// ---------- Views ----------

function signinHTML() {
  const f = window.vp.features || {};
  return `
    <div class="sheet-content">
      <div class="sheet-bar">
        <h2>Sign in to save</h2>
        <button class="sheet-close" data-action="close" aria-label="Close">✕</button>
      </div>
      <p class="sheet-sub">
        <span class="why">Browsing as a guest works.</span>
        Sign in to keep your chat history, itinerary, and favorites across devices.
      </p>
      ${state.error ? `<div class="auth-error">${esc(state.error)}</div>` : ''}
      ${f.has_google ? `
        <button class="btn-primary btn-google" id="btn-google" type="button">
          <span class="g-icon">G</span> Continue with Google
        </button>
        <div class="divider"><span>or</span></div>
      ` : ''}
      <form id="email-form">
        <label>Email
          <input type="email" name="email" required autocomplete="email" value="${esc(state.email)}">
        </label>
        <label>Password
          <input type="password" name="password" required minlength="8" autocomplete="current-password">
        </label>
        <button class="btn-primary" type="submit">Continue</button>
      </form>
      <button class="link-btn" data-action="close">Skip for now</button>
    </div>
  `;
}

function verifyHTML() {
  return `
    <div class="sheet-content">
      <div class="sheet-bar">
        <h2>Enter your code</h2>
        <button class="sheet-close" data-action="close" aria-label="Close">✕</button>
      </div>
      <p class="sheet-sub">We sent a 6-digit code to <strong>${esc(state.email)}</strong>. It expires in 10 minutes.</p>
      ${state.error ? `<div class="auth-error">${esc(state.error)}</div>` : ''}
      <form id="verify-form">
        <div class="verify-grid" id="verify-grid">
          ${Array.from({length: 6}, (_,i) => `<input type="text" maxlength="1" inputmode="numeric" data-i="${i}">`).join('')}
        </div>
        <button class="btn-primary" type="submit">Verify</button>
      </form>
      <button class="link-btn" id="resend">Resend code</button>
    </div>
  `;
}

function accountHTML() {
  const u = window.vp.user || {};
  return `
    <div class="sheet-content">
      <div class="sheet-bar">
        <h2>Your account</h2>
        <button class="sheet-close" data-action="close" aria-label="Close">✕</button>
      </div>
      <div class="account-info">
        ${u.name ? `<div class="name">${esc(u.name)}</div>` : ''}
        <div class="email">${esc(u.email)}</div>
        ${u.email_verified ? '' : '<div class="auth-error" style="margin-top:8px">Email not yet verified.</div>'}
      </div>
      <button class="btn-outline" id="sign-out">Sign out</button>
      <button class="link-btn" id="delete-account" style="color: var(--cinnabar)">Delete account</button>
    </div>
  `;
}

// ---------- Wiring ----------

function attach() {
  const s = $sheet();
  s.querySelectorAll('[data-action="close"]').forEach((el) =>
    el.addEventListener('click', close));
  const g = s.querySelector('#btn-google');
  if (g) g.addEventListener('click', () => { window.location.href = '/api/auth/google'; });
  const email = s.querySelector('#email-form');
  if (email) email.addEventListener('submit', onEmailSubmit);
  const verify = s.querySelector('#verify-form');
  if (verify) {
    verify.addEventListener('submit', onVerifySubmit);
    wireVerifyInputs(s);
  }
  const resend = s.querySelector('#resend');
  if (resend) resend.addEventListener('click', onResend);
  const out = s.querySelector('#sign-out');
  if (out) out.addEventListener('click', onSignOut);
  const del = s.querySelector('#delete-account');
  if (del) del.addEventListener('click', onDelete);
}

function wireVerifyInputs(scope) {
  const inputs = scope.querySelectorAll('.verify-grid input');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', (e) => {
      const v = e.target.value.replace(/\D/g, '').slice(0, 1);
      e.target.value = v;
      if (v && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1].focus();
    });
    inp.addEventListener('paste', (e) => {
      const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!text) return;
      e.preventDefault();
      for (let k = 0; k < text.length && k < inputs.length; k++) inputs[k].value = text[k];
      inputs[Math.min(text.length, inputs.length - 1)].focus();
    });
  });
  inputs[0]?.focus();
}

async function onEmailSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  state.email = email;
  state.error = null;
  // Try login first; if 401/404 try register.
  try {
    const data = await api.post('/api/auth/login', { email, password });
    if (data.user) {
      window.vp.user = data.user;
      window.location.reload();
      return;
    }
  } catch (err) {
    if (err.status === 401 || err.status === 404) {
      try {
        const data = await api.post('/api/auth/register', { email, password });
        if (data.verify_required) {
          state.view = 'verify';
          state.error = null;
          render();
          return;
        }
        if (data.user) {
          window.vp.user = data.user;
          window.location.reload();
          return;
        }
      } catch (err2) {
        state.error = err2.message || 'Could not sign up';
        render();
        return;
      }
    } else {
      state.error = err.message || 'Could not sign in';
      render();
      return;
    }
  }
}

async function onVerifySubmit(e) {
  e.preventDefault();
  const inputs = e.target.querySelectorAll('.verify-grid input');
  const code = Array.from(inputs).map((i) => i.value).join('');
  if (code.length !== 6) {
    state.error = 'Enter the full 6-digit code';
    render();
    return;
  }
  try {
    const data = await api.post('/api/auth/verify', { email: state.email, code });
    if (data.user) {
      window.vp.user = data.user;
      window.location.reload();
    }
  } catch (err) {
    state.error = err.message || 'Incorrect code';
    render();
  }
}

async function onResend() {
  state.error = null;
  try {
    await api.post('/api/auth/verify/resend', { email: state.email });
    state.error = 'A new code was sent.';
  } catch (err) {
    state.error = err.message || 'Could not resend';
  }
  render();
}

async function onSignOut() {
  try { await api.post('/api/auth/logout', {}); } catch (_) {}
  window.vp.user = null;
  window.location.reload();
}

async function onDelete() {
  if (!confirm('Permanently delete your account and all saved data?')) return;
  try { await api.del('/api/auth/account'); } catch (_) {}
  window.vp.user = null;
  window.location.reload();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
