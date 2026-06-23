let timer = null;

export function showToast(message, kind = "info") {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add("is-visible");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("is-visible"), 3200);
}
