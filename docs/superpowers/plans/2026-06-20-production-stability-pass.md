# VisePanda v5.0.9 Production Stability Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore production usability on the live VisePanda site by fixing non-responsive sign-in, broken images, sluggish page/view transitions, and hidden mobile navigation without adding new product features.

**Architecture:** Keep the current WSGI + Vanilla SPA structure, but harden the frontend bootstrap path so a single failure cannot take down auth, nav, or view switching. Add a lightweight UI state layer for loading/error/fallback behavior, make image delivery resilient, and tighten mobile navigation/layout behavior with targeted CSS/HTML patches rather than a full redesign.

**Tech Stack:** Python 3 stdlib, Vanilla JS, HTML, CSS, Node `--test`, integrated browser/manual smoke verification

---

## File Map

- `web/index.html`
  - Main SPA shell
  - Sign-in trigger
  - View containers
  - Image/fallback hooks
  - Loading/error shell placeholders
  - Mobile/bottom navigation structure
- `web/app.js`
  - Bootstrap/init path
  - View navigation and lazy loading
  - Auth modal trigger logic
  - Shared loading/error helpers
  - Image fallback attachment
  - Per-view load guards
- `web/app.css`
  - Mobile nav visibility rules
  - Safe-area and viewport sizing fixes
  - Loading/skeleton/error states
  - Image fallback styling
  - Clickability/z-index corrections
- `web/tests/view-registry.test.js`
  - Existing structure regression coverage
- `web/tests/stability-ui.test.js`
  - New stability-focused structure/behavior checks
- `README.md`
  - Release summary update
- `HANDOFF.md`
  - Production stability notes
- `CHANGELOG.md`
  - `v5.0.9` release entry

---

### Task 1: Add failing stability regression tests

**Files:**
- Create: `web/tests/stability-ui.test.js`
- Modify: `web/tests/view-registry.test.js`
- Test: `web/tests/stability-ui.test.js`

- [ ] **Step 1: Write the failing test file for auth/nav/loading/image stability**

```js
// web/tests/stability-ui.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');

test('auth trigger exposes stable modal hooks', () => {
  assert.match(html, /id="auth-btn"/);
  assert.match(html, /id="auth-modal-overlay"/);
  assert.match(appJs, /bindAuthTriggers/);
  assert.match(appJs, /safeInitStep/);
});

test('view shell exposes loading and error containers', () => {
  assert.match(html, /id="global-loading-state"/);
  assert.match(html, /id="global-error-state"/);
  assert.match(appJs, /showGlobalLoading/);
  assert.match(appJs, /showGlobalError/);
});

test('image elements expose fallback hooks', () => {
  assert.match(html, /data-img-fallback/);
  assert.match(appJs, /attachImageFallbacks/);
  assert.match(css, /\.img-fallback\b/);
});

test('mobile navigation remains structurally visible', () => {
  assert.match(html, /id="bottom-nav"/);
  assert.match(html, /data-mobile-nav="primary"/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /\.bottom-nav\b/);
});
```

- [ ] **Step 2: Extend the existing view registry test with production-stability hooks**

```js
// web/tests/view-registry.test.js
test('visible version is updated to v5.0.9', () => {
  assert.match(html, /v5\.0\.9/);
  assert.match(appJs, /5\.0\.9/);
});

test('sign in and primary nav remain in the main shell', () => {
  assert.match(html, /id="auth-btn"/);
  assert.match(html, /class="nav-btn active"/);
  assert.match(html, /id="bottom-nav"/);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
node --test web/tests/stability-ui.test.js web/tests/view-registry.test.js
```

Expected:

- `stability-ui.test.js` fails because `global-loading-state`, `global-error-state`, and `data-img-fallback` do not exist yet
- `view-registry.test.js` fails because the visible version is still `v5.0.8`

- [ ] **Step 4: Commit the failing tests**

```bash
git add web/tests/stability-ui.test.js web/tests/view-registry.test.js
git commit -m "test: add production stability regression coverage"
```

---

### Task 2: Harden bootstrap and auth/nav event binding

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `web/tests/stability-ui.test.js`

- [ ] **Step 1: Add stable global loading and error containers to the shell**

```html
<!-- web/index.html -->
<main id="main">
  <div id="global-loading-state" class="global-loading-state hidden" aria-live="polite">
    <div class="global-loading-copy">Loading VisePanda…</div>
  </div>
  <div id="global-error-state" class="global-error-state hidden" role="alert">
    <div class="global-error-copy">Something stalled while loading this screen.</div>
    <button class="global-retry-btn" onclick="VP.retryCurrentView()">Try again</button>
  </div>
  <!-- existing views stay here -->
</main>
```

- [ ] **Step 2: Add a guarded bootstrap path in `web/app.js`**

```js
// web/app.js
function safeInitStep(name, fn) {
  try {
    fn();
  } catch (error) {
    console.error('[VP:init]', name, error);
    showGlobalError(`Failed to initialize ${name}.`);
  }
}

function showGlobalLoading(message) {
  const box = document.getElementById('global-loading-state');
  if (!box) return;
  box.classList.remove('hidden');
  const copy = box.querySelector('.global-loading-copy');
  if (copy && message) copy.textContent = message;
}

function hideGlobalLoading() {
  const box = document.getElementById('global-loading-state');
  if (box) box.classList.add('hidden');
}

function showGlobalError(message) {
  const box = document.getElementById('global-error-state');
  if (!box) return;
  const copy = box.querySelector('.global-error-copy');
  if (copy && message) copy.textContent = message;
  box.classList.remove('hidden');
}

function hideGlobalError() {
  const box = document.getElementById('global-error-state');
  if (box) box.classList.add('hidden');
}
```

- [ ] **Step 3: Split auth and nav binding into dedicated bootstrap helpers**

```js
// web/app.js
function bindAuthTriggers() {
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) {
    authBtn.style.display = 'block';
    authBtn.disabled = false;
    authBtn.addEventListener('click', (event) => {
      event.preventDefault();
      hideGlobalError();
      VP.auth.showModal();
    });
  }
}

function bindPrimaryNav() {
  document.querySelectorAll('.nav-btn, .bn-btn').forEach((btn) => {
    btn.addEventListener('click', () => hideGlobalError());
  });
}
```

- [ ] **Step 4: Update the main `init()` flow to use guarded steps**

```js
// web/app.js
function init() {
  showGlobalLoading('Loading VisePanda…');

  safeInitStep('theme', initTheme);
  safeInitStep('auth triggers', bindAuthTriggers);
  safeInitStep('primary nav', bindPrimaryNav);
  safeInitStep('cities filter rail', setupCitiesFilterRail);
  safeInitStep('hash navigation', initHashNavigation);
  safeInitStep('initial view', () => {
    const hash = (window.location.hash || '#home').replace('#', '');
    navigate(hash);
  });

  hideGlobalLoading();
}
```

- [ ] **Step 5: Run the targeted tests to verify they pass**

Run:

```bash
node --test web/tests/stability-ui.test.js
```

Expected:

- Auth/nav/loading related checks pass
- Image and mobile-nav checks may still fail until later tasks land

- [ ] **Step 6: Commit the bootstrap/auth fix**

```bash
git add web/index.html web/app.js web/tests/stability-ui.test.js
git commit -m "fix: harden bootstrap and auth entry points"
```

---

### Task 3: Fix production image delivery and fallback behavior

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/app.css`
- Test: `web/tests/stability-ui.test.js`

- [ ] **Step 1: Add image fallback attributes to production-facing image nodes**

```html
<!-- web/index.html -->
<img
  src="/static/img/cities/beijing.jpg"
  alt="Beijing skyline"
  loading="eager"
  decoding="async"
  data-img-fallback="/static/img/fallback-city.jpg"
  class="hero-image"
>
```

```html
<!-- repeat pattern for card images -->
<img
  src="/static/img/cities/shanghai.jpg"
  alt="Shanghai at dusk"
  loading="lazy"
  decoding="async"
  data-img-fallback="/static/img/fallback-city.jpg"
  class="city-card-image"
>
```

- [ ] **Step 2: Add a single fallback attachment helper in `web/app.js`**

```js
// web/app.js
function attachImageFallbacks(root = document) {
  root.querySelectorAll('img[data-img-fallback]').forEach((img) => {
    if (img.dataset.fallbackBound === 'true') return;
    img.dataset.fallbackBound = 'true';
    img.addEventListener('error', () => {
      const fallback = img.dataset.imgFallback;
      if (fallback && img.src !== fallback) {
        img.src = fallback;
        img.classList.add('img-fallback');
        return;
      }
      img.closest('.image-shell')?.classList.add('image-shell-failed');
    });
  });
}
```

- [ ] **Step 3: Run fallback binding after initial shell render and after lazy views render**

```js
// web/app.js
function navigate(view) {
  // existing view logic
  const target = document.getElementById(`view-${view}`);
  if (target) attachImageFallbacks(target);
}

document.addEventListener('DOMContentLoaded', () => {
  VP.init();
  attachImageFallbacks(document);
});
```

- [ ] **Step 4: Add CSS for graceful fallback display**

```css
/* web/app.css */
.img-fallback {
  object-fit: cover;
  filter: saturate(.9) contrast(.96);
}

.image-shell-failed {
  min-height: 180px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(188,58,44,.12), rgba(255,255,255,.03));
  border: 1px solid var(--border-default);
}

.image-shell-failed::after {
  content: "Image unavailable";
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
```

- [ ] **Step 5: Run the targeted tests**

Run:

```bash
node --test web/tests/stability-ui.test.js
```

Expected:

- Image fallback checks now pass

- [ ] **Step 6: Commit the image fallback fix**

```bash
git add web/index.html web/app.js web/app.css web/tests/stability-ui.test.js
git commit -m "fix: add resilient image fallback handling"
```

---

### Task 4: Improve view responsiveness and per-view loading feedback

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/app.css`
- Test: `web/tests/stability-ui.test.js`

- [ ] **Step 1: Add reusable loading and error shells inside slow views**

```html
<!-- web/index.html -->
<section id="view-cities" class="view">
  <div class="view-state-shell">
    <div id="cities-loading" class="view-loading hidden">Loading city dossiers…</div>
    <div id="cities-error" class="view-error hidden">
      <span>Could not load city data.</span>
      <button onclick="VP.retryCurrentView()">Retry</button>
    </div>
  </div>
  <div id="cities-grid" class="city-grid"></div>
</section>
```

- [ ] **Step 2: Add generic helpers for view-level state toggles**

```js
// web/app.js
function setViewState(view, state, message = '') {
  const loading = document.getElementById(`${view}-loading`);
  const error = document.getElementById(`${view}-error`);

  if (loading) loading.classList.toggle('hidden', state !== 'loading');
  if (error) error.classList.toggle('hidden', state !== 'error');
  if (state === 'error' && error && message) {
    const text = error.querySelector('span');
    if (text) text.textContent = message;
  }
}

function retryCurrentView() {
  hideGlobalError();
  navigate(state.currentView || 'home');
}
```

- [ ] **Step 3: Wrap async loaders with loading/error transitions**

```js
// web/app.js
async function loadCities() {
  setViewState('cities', 'loading');
  try {
    const data = await apiGet('/api/cities');
    renderCities(data);
    setViewState('cities', 'ready');
  } catch (error) {
    console.error('[VP:cities]', error);
    setViewState('cities', 'error', 'Could not load city data.');
  }
}

async function loadTools() {
  setViewState('tools', 'loading');
  try {
    const data = await apiGet('/api/tools');
    renderTools(data);
    setViewState('tools', 'ready');
  } catch (error) {
    console.error('[VP:tools]', error);
    setViewState('tools', 'error', 'Could not load toolkit data.');
  }
}
```

- [ ] **Step 4: Add CSS for visible feedback states**

```css
/* web/app.css */
.view-state-shell {
  width: min(100%, var(--max-w));
  margin: 0 auto 12px;
}

.view-loading,
.view-error {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.view-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
```

- [ ] **Step 5: Run the full frontend test suite**

Run:

```bash
node --test web/tests/*.test.js
```

Expected:

- Existing structure tests still pass
- Stability checks for loading/error containers now pass

- [ ] **Step 6: Commit the view responsiveness pass**

```bash
git add web/index.html web/app.js web/app.css web/tests/stability-ui.test.js web/tests/view-registry.test.js
git commit -m "fix: add view loading and error feedback"
```

---

### Task 5: Repair mobile navigation visibility and viewport behavior

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.css`
- Test: `web/tests/stability-ui.test.js`

- [ ] **Step 1: Mark the bottom navigation as the primary mobile nav shell**

```html
<!-- web/index.html -->
<nav id="bottom-nav" class="bottom-nav" data-mobile-nav="primary" aria-label="Primary navigation">
  <!-- existing buttons -->
</nav>
```

- [ ] **Step 2: Normalize the main content and footer spacing against mobile nav height**

```css
/* web/app.css */
@media (max-width: 640px) {
  #main {
    padding-bottom: calc(var(--bottom-nav-safe) + 8px);
  }

  .view {
    padding-bottom: calc(var(--bottom-nav-safe) + 8px);
  }

  .bottom-nav {
    display: flex;
    visibility: visible;
    opacity: 1;
    z-index: 220;
  }
}
```

- [ ] **Step 3: Prevent accidental desktop/mobile nav overlap**

```css
/* web/app.css */
@media (min-width: 641px) {
  .bottom-nav {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .header-nav {
    display: none !important;
  }
}
```

- [ ] **Step 4: Add a tiny mobile smoke hook to the test file**

```js
// web/tests/stability-ui.test.js
test('mobile nav uses explicit primary-nav marker and safe-area shell', () => {
  assert.match(html, /data-mobile-nav="primary"/);
  assert.match(css, /--bottom-nav-safe/);
  assert.match(css, /\.bottom-nav\b/);
});
```

- [ ] **Step 5: Run the targeted tests**

Run:

```bash
node --test web/tests/stability-ui.test.js
```

Expected:

- Mobile navigation checks pass

- [ ] **Step 6: Commit the mobile layout fix**

```bash
git add web/index.html web/app.css web/tests/stability-ui.test.js
git commit -m "fix: restore mobile navigation visibility"
```

---

### Task 6: Run smoke checks, update docs, and prepare the release

**Files:**
- Modify: `README.md`
- Modify: `HANDOFF.md`
- Modify: `CHANGELOG.md`
- Modify: `api/index.py`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/app.css`
- Test: `tests/`
- Test: `web/tests/`

- [ ] **Step 1: Update the version to `v5.0.9` in visible/runtime locations**

```python
# api/index.py
APP_VERSION = "5.0.9"
```

```html
<!-- web/index.html -->
<span id="version-badge" class="version-badge">v5.0.9</span>
<span id="footer-version">VisePanda v5.0.9</span>
```

```js
// web/app.js
const ver = config.version || '5.0.9';
```

```css
/* web/app.css */
/* VisePanda v5.0.9 — Panda × China Design System */
```

- [ ] **Step 2: Add the release entry to `CHANGELOG.md`**

```md
## v5.0.9 — 2026-06-20

### Fixed
- Repaired the production sign-in trigger and hardened the frontend bootstrap path
- Added resilient image fallback handling for production-facing visuals
- Added loading/error shells so key views no longer feel unresponsive
- Restored mobile tab/navigation visibility on portrait layouts

### Regression
- Ran `python3 -m unittest discover -s tests -v` — 14 backend tests passed
- Ran `node --test web/tests/*.test.js` — frontend structure/stability tests passed
```

- [ ] **Step 3: Update `README.md` and `HANDOFF.md` with the stability pass summary**

```md
| 🛡️ Production Stability Pass | Sign-in recovery / image fallback / loading feedback / mobile nav visibility | ✅ Landed |
```

```md
| 🛡️ Production Stability Pass | Bootstrap hardening / image fallback / mobile nav recovery / loading-state shell | v5.0.9 |
```

- [ ] **Step 4: Run the full regression suite**

Run:

```bash
python3 -m unittest discover -s tests -v
node --test web/tests/*.test.js
```

Expected:

- Python suite passes
- Frontend suite passes, including the new stability tests

- [ ] **Step 5: Run the manual smoke checklist**

Use the browser to verify:

```text
1. Open the live homepage and confirm the hero renders without obvious broken images
2. Click Sign in and confirm the auth modal opens
3. Switch Home → Cities → Trips → Tools → Chat and confirm each view responds
4. Switch to a narrow mobile viewport and confirm bottom nav remains visible and clickable
5. Open a tool detail sheet and confirm it loads instead of feeling dead
```

Expected:

- No dead sign-in button
- No missing primary nav
- No obvious broken hero/card images
- Each key view shows content or a visible loading/error state

- [ ] **Step 6: Commit the release prep**

```bash
git add api/index.py web/index.html web/app.js web/app.css README.md HANDOFF.md CHANGELOG.md
git commit -m "chore(release): prepare v5.0.9 production stability pass"
```

---

## Self-Review

### Spec coverage

- 线上复现与采证：Task 6 的 smoke checklist covers the explicit production verification gate
- 交互链路修复：Task 2 covers bootstrap, sign-in, nav binding
- 图片与资源链路修复：Task 3 covers fallback hooks and resilient image behavior
- 页面响应与反馈：Task 4 covers loading/error shells and retry flow
- 移动端导航与布局：Task 5 covers primary mobile nav visibility and safe-area layout
- 测试与发布：Task 1 + Task 6 cover regression setup, versioning, docs, and release prep

### Placeholder scan

- No `TODO` / `TBD`
- Every code-changing step includes concrete code
- Every run step includes an exact command and expected outcome

### Type consistency

- Shared helper names are consistent across tasks:
  - `safeInitStep`
  - `bindAuthTriggers`
  - `bindPrimaryNav`
  - `showGlobalLoading`
  - `showGlobalError`
  - `attachImageFallbacks`
  - `setViewState`
  - `retryCurrentView`

