// Structural three-line stack: EN / 中 / pinyin.
// Used in city chips, hotel cards, deal cards, and translation hero.
export function bilingualTerm({ en, zh, py } = {}) {
  const el = document.createElement('div');
  el.className = 'bilingual-term';
  const parts = [];
  if (en) parts.push(`<span class="en">${esc(en)}</span>`);
  if (zh) parts.push(`<span class="zh">${esc(zh)}</span>`);
  if (py) parts.push(`<span class="py">${esc(py)}</span>`);
  el.innerHTML = parts.join('');
  return el;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
