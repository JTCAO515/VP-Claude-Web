// Top bar — logo+wordmark, sidebar collapse toggle, 3 primary nav tabs
// (Trips / Explore / Tools), language selector. Renders into #topbar.
//
// "Ask" has no top-tab — it's the implicit landing/home view, reached via
// the sidebar's "+ New chat" or the logo. "Explore" is the display label
// for the 'cities' view (kept the internal key — only the label changed).

const TABS = [
  { key: 'trips',  label: 'Trips' },
  { key: 'cities', label: 'Explore' },
  { key: 'tools',  label: 'Tools' },
];

const LANGS = [
  { code: 'EN', label: 'English' },
  { code: 'ZH', label: '中文' },
  { code: 'ES', label: 'Español' },
  { code: 'FR', label: 'Français' },
  { code: 'JA', label: '日本語' },
];

let state = {
  active: 'ask',
  lang: localStorage.getItem('vp.lang') || 'EN',
  onNav: null,
  onToggleSidebar: null,
};

export function mount({ container, onNav, onToggleSidebar }) {
  state.onNav = onNav;
  state.onToggleSidebar = onToggleSidebar;
  render(container);
}

export function setActive(tab) {
  state.active = tab;
  rerender();
}

function rerender() {
  const root = document.getElementById('topbar');
  if (root) render(root);
}

function highlightKey(active) {
  return active === 'plan' ? 'trips' : active;
}

function render(root) {
  root.innerHTML = '';

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'tb-collapse';
  collapseBtn.setAttribute('aria-label', 'Toggle sidebar');
  collapseBtn.innerHTML = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11 4l-6 6 6 6M16 4l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  collapseBtn.addEventListener('click', () => state.onToggleSidebar && state.onToggleSidebar());
  root.appendChild(collapseBtn);

  const wm = document.createElement('button');
  wm.type = 'button';
  wm.className = 'tb-wordmark';
  wm.innerHTML = `<span class="dot"></span><span class="name">VisePanda</span>`;
  wm.addEventListener('click', () => state.onNav && state.onNav('ask', { fresh: true }));
  root.appendChild(wm);

  const nav = document.createElement('nav');
  nav.className = 'tb-nav';
  const highlighted = highlightKey(state.active);
  for (const t of TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tb-tab' + (t.key === highlighted ? ' active' : '');
    btn.textContent = t.label;
    btn.addEventListener('click', () => state.onNav && state.onNav(t.key));
    nav.appendChild(btn);
  }
  root.appendChild(nav);

  const spacer = document.createElement('div');
  spacer.className = 'tb-spacer';
  root.appendChild(spacer);

  root.appendChild(renderLangSelector());
}

function renderLangSelector() {
  const wrap = document.createElement('div');
  wrap.className = 'tb-lang';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tb-lang-btn';
  btn.innerHTML = `<span class="globe">🌐</span><span class="code">${state.lang}</span><span class="caret">▾</span>`;
  const menu = document.createElement('div');
  menu.className = 'tb-lang-menu';
  menu.hidden = true;
  for (const l of LANGS) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tb-lang-item' + (l.code === state.lang ? ' active' : '');
    item.innerHTML = `<span class="code">${l.code}</span><span class="label">${l.label}</span>`;
    item.addEventListener('click', () => {
      state.lang = l.code;
      localStorage.setItem('vp.lang', l.code);
      menu.hidden = true;
      rerender();
      // UI copy translation itself is out of scope for this pass — the
      // selector persists intent so a future i18n layer has somewhere
      // to read from (window.vp.lang).
      window.vp.lang = l.code;
    });
    menu.appendChild(item);
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  document.addEventListener('click', () => { menu.hidden = true; }, { once: false });
  wrap.appendChild(btn);
  wrap.appendChild(menu);
  return wrap;
}
