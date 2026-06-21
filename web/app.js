const state = {
  token: sessionStorage.getItem("vp_token") || "",
  user: null,
  cities: [],
  tools: [],
  authMode: "login",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
  body.appendChild(createText("p", "meta", `${city.province} | ${city.duration} | ${city.bestSeason}`));
  body.appendChild(createText("p", "meta", city.vibe));
  renderTags(body, city.highlights || []);
  article.appendChild(body);
  return article;
}

async function loadCities() {
  if (!state.cities.length) {
    const data = await api("/api/cities");
    state.cities = data.cities || [];
  }
  const query = ($("#citySearch")?.value || "").toLowerCase();
  const filtered = state.cities.filter((city) => {
    const haystack = [city.name, city.province, city.vibe, ...(city.highlights || [])].join(" ").toLowerCase();
    return haystack.includes(query);
  });
  const grid = $("#cityGrid");
  grid.replaceChildren(...filtered.map(cityCard));
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
  if (!state.tools.length) {
    const data = await api("/api/tools");
    state.tools = data.tools || [];
  }
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
      const data = await api(`/api/tools/${tool.id}`);
      renderToolDetail(data.tool);
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
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok || !response.body) {
    target.textContent = "I could not reach the guide service. Please try again.";
    return;
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
}

async function loadTrips() {
  const list = $("#tripList");
  if (!state.token) {
    const localTrips = JSON.parse(localStorage.getItem("vp_guest_trips") || "[]");
    list.replaceChildren(...localTrips.map(tripCard));
    return;
  }
  const data = await api("/api/trips");
  list.replaceChildren(...(data.trips || []).map(tripCard));
}

function tripCard(trip) {
  const card = document.createElement("article");
  card.className = "trip-card";
  card.appendChild(createText("h3", "", trip.title));
  card.appendChild(createText("p", "meta", trip.destination || "China"));
  const dates = [trip.startDate, trip.endDate].filter(Boolean).join(" to ");
  if (dates) card.appendChild(createText("p", "meta", dates));
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
  $("#citySearch").addEventListener("input", loadCities);
  $("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    await sendChat(message);
  });
  $("#quickPlanner").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setView("chat");
    await sendChat(`Plan a ${values.length} China trip for ${values.destination || "a first-time visitor"}.`);
  });
  $("#tripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveTrip(event.currentTarget);
  });
  $("#refreshTrips").addEventListener("click", loadTrips);
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
  });
  $("#profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const data = await api("/api/auth/update-profile", { method: "POST", body: JSON.stringify(body) });
    state.user = data.user;
    event.currentTarget.elements.currentPassword.value = "";
    event.currentTarget.elements.newPassword.value = "";
    updateAuthUi();
  });
  $("#logoutButton").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
    state.token = "";
    state.user = null;
    sessionStorage.removeItem("vp_token");
    updateAuthUi();
  });
}

async function boot() {
  bindEvents();
  addMessage("VisePanda", "Tell me where you want to go, how many days you have, and your travel style. I will shape a practical China route.");
  await Promise.all([loadCities(), restoreSession()]);
}

document.addEventListener("DOMContentLoaded", boot);
