// Seal chop — small square red box with one Chinese character.
// Pass animate:true to play a one-shot stamp-in entrance on insert.
export function chop(character, { size = 'md', animate = false, delay = 0 } = {}) {
  const el = document.createElement('span');
  const sizeCls = size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : '';
  el.className = 'chop' + sizeCls + (animate ? ' stamp-in' : '');
  el.textContent = character;
  el.setAttribute('aria-hidden', 'true');
  if (animate && delay) {
    el.style.animationDelay = delay + 'ms';
  }
  return el;
}

// Replay the stamp animation on demand (e.g. when re-entering a chapter).
export function stampReplay(el) {
  if (!el) return;
  el.classList.remove('stamp-in');
  // Force reflow so the next add triggers a fresh animation.
  void el.offsetWidth;
  el.classList.add('stamp-in');
}
