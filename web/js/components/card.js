// Generic card factory. Title + meta + optional chop + badges + body slot.
import { chop } from './chop.js';

export function card({ title, meta, chopChar, badges, body, onClick } = {}) {
  const el = document.createElement(onClick ? 'button' : 'div');
  el.className = 'card';
  el.style.textAlign = 'left';
  if (onClick) el.addEventListener('click', onClick);

  if (chopChar) {
    const c = chop(chopChar, { size: 'sm' });
    c.classList.add('card-chop');
    el.appendChild(c);
  }
  if (title) {
    const t = document.createElement('div');
    t.className = 'title';
    t.textContent = title;
    el.appendChild(t);
  }
  if (meta) {
    const m = document.createElement('div');
    m.className = 'meta';
    m.textContent = meta;
    el.appendChild(m);
  }
  if (body) {
    if (typeof body === 'string') {
      const b = document.createElement('div');
      b.innerHTML = body;
      el.appendChild(b);
    } else {
      el.appendChild(body);
    }
  }
  if (Array.isArray(badges) && badges.length) {
    const wrap = document.createElement('div');
    wrap.className = 'badges';
    for (const b of badges) {
      const span = document.createElement('span');
      span.className = 'badge ' + (b.tone || '');
      span.textContent = b.text;
      wrap.appendChild(span);
    }
    el.appendChild(wrap);
  }
  return el;
}
