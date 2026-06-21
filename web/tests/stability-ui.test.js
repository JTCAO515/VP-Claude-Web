const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "app.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("core layout uses stable responsive grids and bounded cards", () => {
  assert.match(css, /grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\)/);
  assert.match(css, /border-radius: 8px/);
  assert.doesNotMatch(css, /font-size:\s*[^;]*vw/);
});

test("first screen is the working planner, not a static landing-only page", () => {
  assert.match(html, /id="quickPlanner"/);
  assert.match(html, /data-view-panel="dashboard"/);
  assert.match(html, /id="featuredCities"/);
});

test("mobile portrait interaction shell has thumb-friendly controls", () => {
  assert.match(css, /\.nav\s*{[^}]*position: fixed/s);
  assert.match(css, /bottom: calc\(10px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.chat-form\s*{[^}]*position: sticky/s);
  assert.match(css, /\.city-strip\s*{[^}]*scroll-snap-type: x mandatory/s);
  assert.match(html, /data-prompt="Plan a first-time 7 day China route/);
});

test("v6.0.7 exposes mobile status surfaces", () => {
  assert.match(html, /id="cityStatus"/);
  assert.match(html, /id="toolStatus"/);
  assert.match(html, /id="tripStatus"/);
  assert.match(html, /id="toast"/);
  assert.match(css, /\.empty-state/);
  assert.match(css, /\.skeleton-card/);
  assert.match(css, /\.toast\.is-visible/);
  assert.match(css, /\.sheet-handle/);
});

test("v6.0.7 uses shared visual system tokens", () => {
  assert.match(css, /--surface:/);
  assert.match(css, /--focus-ring:/);
  assert.match(css, /--shadow-raised:/);
  assert.match(css, /\.city-card__facts/);
  assert.match(css, /\.trip-card__facts/);
  assert.match(html, /20260622-v607-auth2/);
});

test("v6.0.7 exposes professional chat controls", () => {
  assert.match(html, /id="chatMode"/);
  assert.match(html, /id="chatProvider"/);
  assert.match(html, /id="chatDepth"/);
  assert.match(html, /data-mode="entry"/);
  assert.match(html, /data-depth="expert"/);
  assert.match(css, /\.chat-toolbar/);
  assert.match(css, /\.preset-group/);
});

test("v6.0.7 exposes email verification and Google auth controls", () => {
  assert.match(html, /id="googleLogin"/);
  assert.match(html, /id="verifyForm"/);
  assert.match(html, /id="resendVerification"/);
  assert.doesNotMatch(html, /name="name" placeholder="Name"/);
  assert.match(appJs(), /\/api\/auth\/verify-email/);
  assert.match(appJs(), /\/api\/auth\/resend-verification/);
});

function appJs() {
  return fs.readFileSync(path.join(root, "app.js"), "utf8");
}
