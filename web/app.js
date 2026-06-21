const state = {
  token: sessionStorage.getItem("vp_token") || "",
  user: null,
  cities: [],
  tools: [],
  authMode: "login",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function showToast(message, tone = "info") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function setStatus(selector, message, tone = "neutral") {
  const node = $(selector);
  if (!node) return;
  node.textContent = message || "";
  node.dataset.tone = tone;
}

function emptyState(title, text, actionLabel, action) {
  const article = document.createElement("article");
  article.className = "empty-state";
  article.appendChild(createText("h3", "", title));
  article.appendChild(createText("p", "meta", text));
  if (actionLabel && action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = actionLabel;
    button.addEventListener("click", action);
    article.appendChild(button);
  }
  return article;
}

function loadingCards(count = 3) {
  return Array.from({ length: count }, () => {
    const card = document.createElement("article");
    card.className = "skeleton-card";
    card.appendChild(document.createElement("span"));
    card.appendChild(document.createElement("span"));
    card.appendChild(document.createElement("span"));
    return card;
  });
}

async function withButtonBusy(button, label, task) {
  const oldHtml = button.innerHTML;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  if (label) button.textContent = label;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = oldHtml;
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

function setView(view) {
  document.body.dataset.view = view;
  $$(".nav__item").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  $$("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-hidden", panel.dataset.viewPanel !== view));
  if (view === "cities") loadCities();
  if (view === "tools") loadTools();
  if (view === "trips") loadTrips();
}

function createText(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value || "";
  return element;
}

function renderTags(parent, items) {
  const wrap = document.createElement("div");
  wrap.className = "tags";
  items.slice(0, 4).forEach((item) => wrap.appendChild(createText("span", "tag", item)));
  parent.appendChild(wrap);
}

function renderFacts(parent, className, items) {
  const wrap = document.createElement("div");
  wrap.className = className;
  items.filter(Boolean).forEach((item) => wrap.appendChild(createText("span", "", item)));
  if (wrap.children.length) parent.appendChild(wrap);
}

function cityCard(city) {
  const article = document.createElement("article");
  article.className = "city-card";
  const image = document.createElement("img");
  image.src = city.image;
  image.alt = `${city.name} travel view`;
  article.appendChild(image);
  const body = document.createElement("div");
  body.className = "city-card__body";
  body.appendChild(createText("h3", "", city.name));
  renderFacts(body, "city-card__facts", [city.province, city.duration, city.bestSeason]);
  body.appendChild(createText("p", "meta", city.vibe));
  renderTags(body, city.highlights || []);
  article.appendChild(body);
  return article;
}

async function loadCities() {
  const grid = $("#cityGrid");
  try {
    if (!state.cities.length) {
      setStatus("#cityStatus", "Loading city intelligence...");
      grid.replaceChildren(...loadingCards(6));
      const data = await api("/api/cities");
      state.cities = data.cities || [];
    }
  } catch (error) {
    setStatus("#cityStatus", error.message, "error");
    grid.replaceChildren(emptyState("Cities did not load", "Check the connection and try again.", "Retry", loadCities));
    return;
  }
  const query = ($("#citySearch")?.value || "").toLowerCase();
  const filtered = state.cities.filter((city) => {
    const haystack = [city.name, city.province, city.vibe, ...(city.highlights || [])].join(" ").toLowerCase();
    return haystack.includes(query);
  });
  setStatus("#cityStatus", `${filtered.length} destination${filtered.length === 1 ? "" : "s"} ready`);
  grid.replaceChildren(...(filtered.length ? filtered.map(cityCard) : [
    emptyState("No city match", "Try a city, province, season, or highlight such as hotpot or Great Wall.", "Clear search", () => {
      $("#citySearch").value = "";
      loadCities();
    }),
  ]));
  const featured = $("#featuredCities");
  if (featured && !featured.children.length) {
    featured.replaceChildren(...state.cities.slice(0, 4).map(cityCard));
  }
}

function renderToolDetail(tool) {
  const detail = $("#toolDetail");
  detail.replaceChildren();
  detail.appendChild(createText("h3", "", tool.name));
  if (tool.items) {
    const list = document.createElement("ul");
    tool.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.label ? `${item.label}${item.required ? " - essential" : ""}` : `${item.context}: ${item.english}`;
      list.appendChild(li);
    });
    detail.appendChild(list);
  } else if (tool.numbers) {
    const list = document.createElement("ul");
    Object.entries(tool.numbers).forEach(([label, number]) => {
      const li = document.createElement("li");
      li.textContent = `${label}: ${number}`;
      list.appendChild(li);
    });
    detail.appendChild(list);
  } else {
    detail.appendChild(createText("p", "meta", tool.summary || tool.description || ""));
  }
}

async function loadTools() {
  try {
    if (!state.tools.length) {
      setStatus("#toolStatus", "Loading travel tools...");
      $("#toolGrid").replaceChildren(...loadingCards(4));
      const data = await api("/api/tools");
      state.tools = data.tools || [];
    }
  } catch (error) {
    setStatus("#toolStatus", error.message, "error");
    $("#toolGrid").replaceChildren(emptyState("Tools did not load", "The toolkit is temporarily unavailable.", "Retry", loadTools));
    $("#toolDetail").replaceChildren();
    return;
  }
  setStatus("#toolStatus", `${state.tools.length} tools available`);
  const cards = state.tools.map((tool) => {
    const card = document.createElement("article");
    card.className = "tool-card";
    card.appendChild(createText("h3", "", tool.name));
    card.appendChild(createText("p", "meta", tool.description));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = "Open";
    button.addEventListener("click", async () => {
      await withButtonBusy(button, "Opening", async () => {
        try {
          const data = await api(`/api/tools/${tool.id}`);
          renderToolDetail(data.tool);
          showToast(`${tool.name} opened`);
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
    card.appendChild(button);
    return card;
  });
  $("#toolGrid").replaceChildren(...cards);
  if (!$("#toolDetail").children.length && state.tools[0]) {
    const data = await api(`/api/tools/${state.tools[0].id}`);
    renderToolDetail(data.tool);
  }
}

function addMessage(author, text, kind = "") {
  const node = $("#messageTemplate").content.firstElementChild.cloneNode(true);
  node.classList.toggle("is-user", kind === "user");
  $("span", node).textContent = author;
  $("p", node).textContent = text;
  $("#chatLog").appendChild(node);
  $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
  return $("p", node);
}

async function sendChat(message) {
  addMessage("You", message, "user");
  const target = addMessage("VisePanda", "");
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok || !response.body) {
      throw new Error("I could not reach the guide service. Please try again.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      lines.forEach((line) => {
        if (!line.startsWith("data:")) return;
        const payload = JSON.parse(line.slice(5).trim());
        if (payload.token) target.textContent += payload.token;
      });
      $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    }
  } catch (error) {
    target.textContent = "I could not reach the guide service. Please try again.";
    showToast(error.message, "error");
  }
}

async function loadTrips() {
  const list = $("#tripList");
  try {
    if (!state.token) {
      const localTrips = JSON.parse(localStorage.getItem("vp_guest_trips") || "[]");
      setStatus("#tripStatus", localTrips.length ? "Guest trips are saved on this device." : "Guest mode: save a quick trip on this device.");
      list.replaceChildren(...(localTrips.length ? localTrips.map(tripCard) : [
        emptyState("No trips yet", "Save a draft here, or sign in later to sync across devices.", "Use planner", () => setView("dashboard")),
      ]));
      return;
    }
    setStatus("#tripStatus", "Loading saved trips...");
    list.replaceChildren(...loadingCards(2));
    const data = await api("/api/trips");
    const trips = data.trips || [];
    setStatus("#tripStatus", trips.length ? "Synced trips loaded." : "Signed in, but no saved trips yet.");
    list.replaceChildren(...(trips.length ? trips.map(tripCard) : [
      emptyState("No saved trips", "Create your first China trip and it will sync to this account.", "Ask AI", () => setView("chat")),
    ]));
  } catch (error) {
    setStatus("#tripStatus", error.message, "error");
    list.replaceChildren(emptyState("Trips did not load", "Try refreshing this view.", "Retry", loadTrips));
  }
}

function tripCard(trip) {
  const card = document.createElement("article");
  card.className = "trip-card";
  card.appendChild(createText("h3", "", trip.title));
  const dates = [trip.startDate, trip.endDate].filter(Boolean).join(" to ");
  renderFacts(card, "trip-card__facts", [trip.destination || "China", dates]);
  return card;
}

async function saveTrip(form) {
  const body = Object.fromEntries(new FormData(form).entries());
  if (state.token) {
    await api("/api/trips", { method: "POST", body: JSON.stringify(body) });
  } else {
    const trips = JSON.parse(localStorage.getItem("vp_guest_trips") || "[]");
    trips.unshift({ ...body, id: Date.now() });
    localStorage.setItem("vp_guest_trips", JSON.stringify(trips.slice(0, 12)));
  }
  form.reset();
  await loadTrips();
  showToast("Trip saved");
}

function updateAuthUi() {
  const signedIn = Boolean(state.user);
  $("#authTitle").textContent = signedIn ? "Profile" : state.authMode === "login" ? "Sign in" : "Create account";
  $("#authStatus").textContent = signedIn ? `Signed in as ${state.user.email}` : "Save trips across devices and manage your profile.";
  $("#authButton").title = signedIn ? state.user.email : "Account";
  $("#authForm").classList.toggle("is-hidden", signedIn);
  $("#profileForm").classList.toggle("is-hidden", !signedIn);
  $("#toggleAuthMode").textContent = state.authMode === "login" ? "Create an account" : "Sign in instead";
  if (signedIn) {
    $("#profileForm").elements.name.value = state.user.name || "";
  }
}

async function restoreSession() {
  if (!state.token) return;
  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
  } catch {
    state.token = "";
    sessionStorage.removeItem("vp_token");
  }
  updateAuthUi();
}

function bindEvents() {
  $$(".nav__item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  $$("[data-prompt]").forEach((button) => button.addEventListener("click", async () => {
    setView("chat");
    await sendChat(button.dataset.prompt);
  }));
  $("#citySearch").addEventListener("input", loadCities);
  $("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const button = event.currentTarget.querySelector("button");
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    await withButtonBusy(button, "Sending", () => sendChat(message));
  });
  $("#quickPlanner").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const button = event.currentTarget.querySelector("button");
    setView("chat");
    await withButtonBusy(button, "Asking", () => sendChat(`Plan a ${values.length} China trip for ${values.destination || "a first-time visitor"}.`));
  });
  $("#tripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    await withButtonBusy(button, "Saving", () => saveTrip(event.currentTarget));
  });
  $("#refreshTrips").addEventListener("click", (event) => withButtonBusy(event.currentTarget, "Refreshing", loadTrips));
  $("#authButton").addEventListener("click", () => {
    updateAuthUi();
    $("#authDialog").showModal();
  });
  $("#toggleAuthMode").addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "register" : "login";
    updateAuthUi();
  });
  $("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const endpoint = state.authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const button = event.currentTarget.querySelector("button[type='submit']");
    await withButtonBusy(button, "Working", async () => {
      try {
        const data = await api(endpoint, { method: "POST", body: JSON.stringify(body) });
        if (data.token) {
          state.token = data.token;
          sessionStorage.setItem("vp_token", state.token);
          state.user = data.user;
        } else {
          state.authMode = "login";
          const login = await api("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
          state.token = login.token;
          sessionStorage.setItem("vp_token", state.token);
          state.user = login.user;
        }
        event.currentTarget.reset();
        updateAuthUi();
        showToast("Account ready");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  $("#profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const button = event.currentTarget.querySelector("button[type='submit']");
    await withButtonBusy(button, "Updating", async () => {
      try {
        const data = await api("/api/auth/update-profile", { method: "POST", body: JSON.stringify(body) });
        state.user = data.user;
        event.currentTarget.elements.currentPassword.value = "";
        event.currentTarget.elements.newPassword.value = "";
        updateAuthUi();
        showToast("Profile updated");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  $("#logoutButton").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
    state.token = "";
    state.user = null;
    sessionStorage.removeItem("vp_token");
    updateAuthUi();
    showToast("Signed out");
  });
}

async function boot() {
  bindEvents();
  document.body.dataset.view = "dashboard";
  addMessage("VisePanda", "Tell me where you want to go, how many days you have, and your travel style. I will shape a practical China route.");
  await Promise.all([loadCities(), restoreSession()]);
}

document.addEventListener("DOMContentLoaded", boot);
