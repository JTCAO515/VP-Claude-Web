// Seal chop — small square red box with one Chinese character.
export function chop(character, { size = 'md' } = {}) {
  const el = document.createElement('span');
  el.className = 'chop' + (size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : '');
  el.textContent = character;
  el.setAttribute('aria-hidden', 'true');
  return el;
}
