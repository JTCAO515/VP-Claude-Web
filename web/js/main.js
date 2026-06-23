import { initChat } from "./chat.js";
import { initDashboard, loadDashboard } from "./dashboard.js";
import { initTranslate } from "./translate.js";

const VIEWS = ["chat", "dashboard", "translate"];
const loaders = { dashboard: loadDashboard };
const loadedOnce = new Set();

function setView(view) {
  if (!VIEWS.includes(view)) return;
  document.body.dataset.view = view;
  VIEWS.forEach((name) => {
    const panel = document.querySelector(`#panel-${name}`);
    panel.toggleAttribute("hidden", name !== view);
  });
  document.querySelectorAll("[data-view]").forEach((el) => {
    if (!el.matches(".rail__tab, .tabbar__item")) return;
    const isActive = el.dataset.view === view;
    el.classList.toggle("is-active", isActive);
    el.setAttribute("aria-selected", String(isActive));
  });
  if (!loadedOnce.has(view) && loaders[view]) {
    loadedOnce.add(view);
    loaders[view]();
  }
  window.scrollTo({ top: 0, behavior: "auto" });
}

document.querySelectorAll("[data-view]").forEach((el) => {
  if (!el.matches(".rail__tab, .tabbar__item")) return;
  el.addEventListener("click", () => setView(el.dataset.view));
});

initChat();
initDashboard();
initTranslate();
setView("chat");
