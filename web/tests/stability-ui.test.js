const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "app.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const repoRoot = path.resolve(root, "..");

test("core layout uses stable responsive grids and bounded cards", () => {
  assert.match(css, /grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\)/);
  assert.match(css, /min-height: 100dvh/);
  assert.match(css, /border-radius: 8px/);
  assert.doesNotMatch(css, /font-size:\s*[^;]*vw/);
});

test("dashboard remains available but Ask is the first screen", () => {
  assert.match(html, /id="quickPlanner"/);
  assert.match(html, /data-view-panel="dashboard"/);
  assert.match(html, /id="featuredCities"/);
  assert.match(html, /id="tab-dashboard"/);
  assert.match(html, /class="workspace section chat-hero"[^>]*id="panel-chat"/);
  assert.match(appJs(), /setView\("chat"\)/);
});

test("mobile portrait interaction shell has thumb-friendly controls", () => {
  assert.match(css, /\.nav\s*{[^}]*position: fixed/s);
  assert.match(css, /bottom: calc\(8px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.city-strip\s*{[^}]*scroll-snap-type: x mandatory/s);
  assert.match(html, /data-prompt="Plan a first-time 7 day China route/);
});

test("v6.2.1 exposes mobile status surfaces", () => {
  assert.match(html, /id="llmStatus"/);
  assert.match(html, /id="dashboardHotels"/);
  assert.match(html, /id="dashboardTripsList"/);
  assert.match(html, /id="toast"/);
  assert.match(css, /\.empty-state/);
  assert.match(css, /\.skeleton-card/);
  assert.match(css, /\.toast\.is-visible/);
  assert.match(css, /\.sheet-handle/);
});

test("v6.2.1 uses shared visual system tokens", () => {
  assert.match(css, /--surface:/);
  assert.match(css, /--focus-ring:/);
  assert.match(css, /--shadow-raised:/);
  assert.match(css, /\.city-card__facts/);
  assert.match(css, /\.trip-card__facts/);
  assert.match(html, /20260623-v621-travel-butler-translate/);
  assert.match(css, /prefers-color-scheme: dark/);
});

test("v6.2.1 keeps started chat focused on conversation and follow-ups", () => {
  assert.doesNotMatch(html, /id="chatMode"/);
  assert.doesNotMatch(html, /id="chatProvider"/);
  assert.doesNotMatch(html, /id="chatDepth"/);
  assert.doesNotMatch(html, /class="chat-toolbar/);
  assert.doesNotMatch(html, /class="chat-prompts/);
  assert.match(html, /data-mode="entry"/);
  assert.match(html, /data-depth="expert"/);
  assert.match(html, /id="chatWelcome"/);
  assert.match(html, /id="followupSuggestions"/);
  assert.match(css, /\.chat-welcome/);
  assert.match(css, /\.followup-suggestions/);
  assert.match(appJs(), /function buildFollowups/);
  assert.match(appJs(), /function renderFollowups/);
});

test("v6.2.1 exposes email verification and Google auth controls", () => {
  assert.match(html, /id="googleLogin"/);
  assert.match(html, /id="verifyForm"/);
  assert.match(html, /id="resendVerification"/);
  assert.doesNotMatch(html, /name="name" placeholder="Name"/);
  assert.match(appJs(), /\/api\/auth\/verify-email/);
  assert.match(appJs(), /\/api\/auth\/resend-verification/);
});

test("v6.2.1 makes mobile navigation behave like real app tabs", () => {
  assert.match(html, /role="tablist"/);
  assert.match(html, /id="tab-chatbot"[^>]*aria-selected="true"/);
  assert.match(html, /id="tab-dashboard"/);
  assert.match(html, /id="tab-translate"/);
  assert.match(html, /role="tabpanel" aria-labelledby="tab-chatbot"/);
  assert.match(css, /\.nav__item\.is-active::after/);
  assert.match(css, /\.nav__item\[data-view="translate"\]/);
  assert.match(appJs(), /setAttribute\("aria-selected"/);
  assert.match(appJs(), /toggleAttribute\("hidden"/);
});

test("v6.2.1 strengthens the AI-first dashboard and mobile planning surface", () => {
  assert.match(html, /class="[^"]*dashboard-drive/);
  assert.match(html, /id="questionSummary"/);
  assert.match(html, /id="dashboardTrips"/);
  assert.match(html, /class="quick-chips"/);
  assert.match(css, /\.chat-hero/);
  assert.match(css, /\.agent-mark/);
  assert.match(html, /id="mobileAskButton"/);
  assert.match(css, /\.mobile-ask-fab/);
  assert.match(css, /bottom: calc\(92px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(appJs(), /mobileAskButton/);
  assert.match(appJs(), /function loadDashboard/);
});

test("v6.2.1 fixes verified AI-first responsive regressions", () => {
  assert.doesNotMatch(appJs(), /Use planner", \(\) => setView\("dashboard"\)/);
  assert.match(appJs(), /Ask AI", \(\) => setView\("chat"\)/);
  assert.match(appJs(), /is-composing/);
  assert.match(css, /@media \(min-width: 1440px\)/);
  assert.match(css, /width: min\(1120px, calc\(100vw - 180px\)\)/);
  assert.match(css, /body\.is-composing \.nav/);
  assert.doesNotMatch(css, /\.chat-toolbar/);
  assert.doesNotMatch(css, /\.preset-group/);
  assert.match(appJs(), /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
});

test("v6.2.1 keeps the initial Ask screen simple and LLM-like", () => {
  assert.match(html, /Ni hao\. Where in China next\?/);
  assert.match(html, /Ask anything about traveling in China\.\.\./);
  assert.doesNotMatch(html, /Tell me your nationality/);
  assert.match(css, /\.chat-hero:not\(\.has-started\) \.chat-status\s*{[^}]*display: none/s);
  assert.match(css, /\.agent-mark\s*{/);
  assert.match(css, /\.chat-hero:not\(\.has-started\) \.chat-shell\s*{[^}]*background: transparent/s);
  assert.match(css, /\.chat-hero:not\(\.has-started\) \.chat-shell\s*{[^}]*box-shadow: none/s);
  assert.match(css, /\.chat-hero:not\(\.has-started\) \.chat-form textarea\s*{[^}]*min-height: 112px/s);
  assert.match(css, /body\[data-view="chat"\] \.chat-hero:not\(\.has-started\) \.chat-shell\s*{[^}]*height: auto/s);
  assert.match(css, /\.chat-hero:not\(\.has-started\) \.send-label/);
});

test("v6.2.1 moves app tabs into a colorful icon-only rail", () => {
  assert.match(css, /@media \(min-width: 761px\)/);
  assert.match(css, /\.topbar\s*{[\s\S]*?position: fixed;[\s\S]*?width: 76px/s);
  assert.match(css, /\.nav\s*{[\s\S]*?position: fixed;[\s\S]*?left: 0;[\s\S]*?width: 76px/s);
  assert.match(css, /\.nav__item span,[\s\S]*?\.topbar-link span\s*{[\s\S]*?clip: rect\(0, 0, 0, 0\)/s);
  assert.match(html, /id="tab-dashboard"[^>]*aria-label="Dashboard"/);
  assert.match(css, /\.nav__item\[data-view="dashboard"\]/);
});

test("v6.2.1 adds native travel-butler translation surface", () => {
  assert.match(html, /id="tab-translate"/);
  assert.match(html, /id="panel-translate"/);
  assert.match(html, /id="voiceTranslateButton"/);
  assert.match(html, /id="translationInput"/);
  assert.match(html, /id="phraseLibrary"/);
  assert.match(html, /id="translationHistory"/);
  assert.match(css, /\.translate-shell/);
  assert.match(css, /\.phrase-card/);
  assert.match(appJs(), /function loadTranslations/);
  assert.match(appJs(), /function translateText/);
  assert.match(appJs(), /function renderPhraseLibrary/);
  assert.ok(fs.existsSync(path.join(repoRoot, "data", "translations", "phrases.json")));
  assert.ok(fs.existsSync(path.join(repoRoot, "data", "translations", "dining.json")));
  assert.ok(fs.existsSync(path.join(repoRoot, "data", "translations", "attractions.json")));
  assert.ok(fs.existsSync(path.join(repoRoot, "data", "translations", "culture.json")));
});

function appJs() {
  return fs.readFileSync(path.join(root, "app.js"), "utf8");
}
