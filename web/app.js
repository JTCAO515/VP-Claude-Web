const state = {
  token: sessionStorage.getItem("vp_token") || "",
  user: null,
  cities: [],
  map: null,
  translations: null,
  translationDirection: "auto",
  tools: [],
  chat: {
    mode: "itinerary",
    provider: "auto",
    depth: "standard",
    hasStarted: false,
    isStreaming: false,
  },
  authMode: "login",
  pendingEmail: "",
  authConfig: {
    google: false,
    emailVerification: true,
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function showToast(message, tone = "info") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), tone === "error" ? 5600 : 3600);
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
  if (label) setButtonLabel(button, label);
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = oldHtml;
  }
}

function setButtonLabel(button, label) {
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node && !node.nodeValue.trim()) node = walker.nextNode();
  if (node) {
    node.nodeValue = ` ${label}`;
  } else {
    button.appendChild(document.createTextNode(label));
  }
}

async function fetchWithTimeout(path, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(path, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The request took too long. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetchWithTimeout(path, { ...options, headers }, options.timeout || 15000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

function setView(view) {
  document.body.dataset.view = view;
  if (view !== "chat") document.body.classList.remove("is-chat-composing");
  $$(".nav__item").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.tabIndex = active ? 0 : -1;
  });
  $$("[data-view='dashboard']:not(.nav__item)").forEach((button) => {
    button.setAttribute("aria-current", view === "dashboard" ? "page" : "false");
  });
  $$("[data-view-panel]").forEach((panel) => {
    const hidden = panel.dataset.viewPanel !== view;
    panel.classList.toggle("is-hidden", hidden);
    panel.toggleAttribute("hidden", hidden);
  });
  if (view === "dashboard") loadDashboard();
  if (view === "translate") loadTranslations();
  if (view === "cities") loadCities();
  if (view === "map") loadMap();
  if (view === "tools") loadTools();
  if (view === "trips") loadTrips();
  if (window.matchMedia("(max-width: 560px)").matches) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
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

function populateSelect(selector, items, selected) {
  const select = $(selector);
  if (!select || !items?.length) return;
  select.replaceChildren(...items.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.available === false ? `${item.label} (not configured)` : item.label;
    option.disabled = item.available === false;
    option.title = item.description || "";
    return option;
  }));
  const enabled = items.find((item) => item.id === selected && item.available !== false) || items.find((item) => item.available !== false);
  if (enabled) select.value = enabled.id;
}

function renderFacts(parent, className, items) {
  const wrap = document.createElement("div");
  wrap.className = className;
  items.filter(Boolean).forEach((item) => wrap.appendChild(createText("span", "", item)));
  if (wrap.children.length) parent.appendChild(wrap);
}

async function loadChatOptions() {
  try {
    await api("/api/chat");
    if (!state.chat.hasStarted) setStatus("#chatStatus", "Ready. Start with a question or a quick prompt.");
  } catch (error) {
    setStatus("#chatStatus", "Chat is using local defaults.", "error");
  }
}

async function loadAuthConfig() {
  try {
    state.authConfig = await api("/api/auth/config");
  } catch (error) {
    state.authConfig = { google: false, emailVerification: true };
    showToast("Account providers are using local defaults.", "error");
  }
  updateAuthUi();
}

function cityCard(city) {
  const article = document.createElement("article");
  article.className = "city-card";
  const image = document.createElement("img");
  image.loading = "lazy";
  image.src = city.image || "/static/img/great-wall.jpg";
  image.alt = `${city.name} travel view`;
  image.addEventListener("error", () => {
    image.src = "/static/img/great-wall.jpg";
  }, { once: true });
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
  const featured = $("#featuredCities");
  try {
    if (!state.cities.length) {
      setStatus("#cityStatus", "Loading city intelligence...");
      grid.replaceChildren(...loadingCards(6));
      if (featured && !featured.children.length) featured.replaceChildren(...loadingCards(4));
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
  if (featured && !featured.children.length) {
    featured.replaceChildren(...state.cities.slice(0, 4).map(cityCard));
  } else if (featured && featured.querySelector(".skeleton-card")) {
    featured.replaceChildren(...state.cities.slice(0, 4).map(cityCard));
  }
}

function getRecentQuestions() {
  try {
    return JSON.parse(localStorage.getItem("vp_recent_questions") || "[]");
  } catch {
    return [];
  }
}

function saveRecentQuestion(message) {
  const trimmed = message.trim();
  if (!trimmed) return;
  const questions = getRecentQuestions().filter((item) => item.question !== trimmed);
  questions.unshift({
    question: trimmed,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem("vp_recent_questions", JSON.stringify(questions.slice(0, 8)));
  loadDashboard();
}

function getGuestTrips() {
  try {
    return JSON.parse(localStorage.getItem("vp_guest_trips") || "[]");
  } catch {
    return [];
  }
}

function loadDashboard() {
  const questions = getRecentQuestions();
  const trips = getGuestTrips();
  const questionSummary = $("#questionSummary");
  const dashboardTrips = $("#dashboardTrips");
  const dashboardNext = $("#dashboardNext");
  const recentQuestions = $("#recentQuestions");
  if (questionSummary) {
    questionSummary.textContent = questions.length
      ? `${questions.length} recent question${questions.length === 1 ? "" : "s"} saved for this planning session.`
      : "No questions yet. Ask VisePanda to start building context.";
  }
  if (dashboardTrips) {
    dashboardTrips.textContent = trips.length
      ? `${trips.length} saved trip${trips.length === 1 ? "" : "s"} on this device.`
      : "No saved trips on this device yet.";
  }
  if (dashboardNext) {
    dashboardNext.textContent = questions[0]?.question
      ? "Continue from your latest question or turn the answer into a saved trip."
      : "Start with dates, route style, or entry requirements.";
  }
  if (!recentQuestions) return;
  const cards = questions.slice(0, 4).map((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "question-card";
    card.textContent = item.question;
    card.addEventListener("click", async () => {
      setView("chat");
      await sendChat(item.question);
    });
    return card;
  });
  recentQuestions.replaceChildren(...(cards.length ? cards : [
    emptyState("No questions yet", "Your recent Ask messages will appear here so the dashboard can become a travel command center.", "Ask VisePanda", () => setView("chat")),
  ]));
}

function renderMapBoard(payload = {}) {
  const board = $("#mapBoard");
  if (!board) return;
  const cities = (payload.cities || state.cities || []).slice(0, 6);
  const routes = payload.routes || [
    { name: "Beijing to Xi'an", type: "High-speed rail", duration: "4.5-6h" },
    { name: "Xi'an to Shanghai", type: "High-speed rail or flight", duration: "6-7h rail" },
    { name: "Shanghai to Chengdu", type: "Flight favored", duration: "3.5h flight" },
  ];
  const routeCards = routes.slice(0, 4).map((route) => {
    const card = document.createElement("article");
    card.className = "map-card";
    card.appendChild(createText("h3", "", route.name || route.label || "China route"));
    card.appendChild(createText("p", "meta", [route.type, route.duration].filter(Boolean).join(" - ") || route.summary || "Compare rail, flight, and transfer friction."));
    return card;
  });
  const cityPins = cities.map((city) => {
    const pin = document.createElement("span");
    pin.className = "map-pin";
    pin.textContent = city.name || city;
    return pin;
  });
  const canvas = document.createElement("div");
  canvas.className = "map-canvas";
  canvas.append(...cityPins);
  board.replaceChildren(canvas, ...routeCards);
}

async function loadMap() {
  try {
    setStatus("#mapStatus", "Loading route intelligence...");
    if (!state.map) {
      const data = await api("/api/map");
      state.map = data;
    }
    renderMapBoard(state.map);
    setStatus("#mapStatus", "Map intelligence is ready.");
  } catch (error) {
    setStatus("#mapStatus", "Using starter route intelligence.", "error");
    renderMapBoard();
  }
}

function translationHistory() {
  try {
    return JSON.parse(localStorage.getItem("vp_translation_history") || "[]");
  } catch {
    return [];
  }
}

function saveTranslationHistory(source, result) {
  const history = translationHistory().filter((item) => item.source !== source);
  history.unshift({ source, result, createdAt: new Date().toISOString() });
  localStorage.setItem("vp_translation_history", JSON.stringify(history.slice(0, 10)));
  renderTranslationHistory();
}

function flattenTranslationEntries(data) {
  if (!data) return [];
  return [
    ...(data.phrases?.phrases || []).map((item) => ({ ...item, type: "Phrase" })),
    ...(data.dining?.dishes || []).map((item) => ({ ...item, type: "Dish" })),
    ...(data.attractions?.attractions || []).map((item) => ({ ...item, type: "Attraction" })),
    ...(data.attractions?.signs || []).map((item) => ({ ...item, type: "Sign" })),
    ...(data.culture?.culture || []).map((item) => ({ ...item, type: "Culture" })),
  ];
}

function renderPhraseLibrary() {
  const library = $("#phraseLibrary");
  if (!library || !state.translations) return;
  const entries = flattenTranslationEntries(state.translations).slice(0, 18);
  const cards = entries.map((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "phrase-card";
    card.dataset.source = item.english || item.chinese || item.topic;
    card.innerHTML = "";
    card.appendChild(createText("strong", "", item.english || item.topic || item.chinese));
    card.appendChild(createText("span", "", item.chinese || ""));
    card.appendChild(createText("small", "", [item.type, item.pinyin].filter(Boolean).join(" - ")));
    card.addEventListener("click", () => {
      $("#translationInput").value = card.dataset.source;
      translateText(card.dataset.source);
    });
    return card;
  });
  library.replaceChildren(...cards);
}

function renderTranslationHistory() {
  const wrap = $("#translationHistory");
  if (!wrap) return;
  const cards = translationHistory().map((item) => {
    const card = document.createElement("article");
    card.className = "history-card";
    card.appendChild(createText("strong", "", item.source));
    card.appendChild(createText("span", "", item.result));
    return card;
  });
  wrap.replaceChildren(...(cards.length ? cards : [
    emptyState("No translation history", "Recent translations stay on this device. Clear them anytime.", "", null),
  ]));
}

function detectTranslationDirection(text) {
  if (state.translationDirection !== "auto") return state.translationDirection;
  return /[\u3400-\u9fff]/.test(text) ? "zh-en" : "en-zh";
}

function translateText(value) {
  const text = (value || "").trim();
  const output = $("#translationOutput");
  if (!text) {
    if (output) output.textContent = "Enter text to translate.";
    return "";
  }
  const direction = detectTranslationDirection(text);
  const entries = flattenTranslationEntries(state.translations);
  const match = entries.find((item) => {
    const haystack = [item.english, item.chinese, item.pinyin, item.topic, ...(item.aliases || [])].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(text.toLowerCase()) || text.toLowerCase().includes((item.english || "").toLowerCase()) || text.includes(item.chinese || "\u0000");
  });
  let result;
  if (match) {
    const primary = direction === "zh-en" ? match.english || match.topic : match.chinese;
    const secondary = direction === "zh-en" ? match.pinyin : match.english || match.topic;
    result = [primary, secondary, match.notes || match.use].filter(Boolean).join(" | ");
  } else if (direction === "zh-en") {
    result = "Quick meaning unavailable in the local travel dictionary. Ask VisePanda for a fuller translation when online.";
  } else {
    result = "本地旅行词库暂未收录这句话。联网时可让 VisePanda 做完整翻译。";
  }
  if (output) output.textContent = result;
  saveTranslationHistory(text, result);
  return result;
}

async function loadTranslations() {
  try {
    if (!state.translations) {
      setStatus("#translateStatus", "Loading travel translation library...");
      state.translations = await api("/api/translations");
    }
    renderPhraseLibrary();
    renderTranslationHistory();
    setStatus("#translateStatus", "Translation library ready for taxi, hotel, dining, signs, and emergency moments.");
  } catch (error) {
    setStatus("#translateStatus", "Translation library could not load. Try again online.", "error");
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
  $(".message__author", node).textContent = author;
  $(".message__body", node).textContent = text;
  $("#chatLog").appendChild(node);
  $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
  return $(".message__body", node);
}

function currentChatSettings(overrides = {}) {
  return {
    mode: overrides.mode || state.chat.mode,
    provider: overrides.provider || state.chat.provider,
    depth: overrides.depth || state.chat.depth,
  };
}

function buildFollowups(message, answer = "") {
  const haystack = `${message} ${answer}`.toLowerCase();
  const suggestions = [];
  const add = (text) => {
    if (suggestions.length < 3 && !suggestions.includes(text)) suggestions.push(text);
  };
  if (/visa|entry|passport|transit|document/.test(haystack)) add("What documents should I prepare before booking?");
  if (/budget|cost|price|spend|money/.test(haystack)) add("Can you break this into low, mid, and comfortable budgets?");
  if (/city|beijing|shanghai|chengdu|xi'an|xian|guilin|zhangjiajie/.test(haystack)) add("Which city should I choose if I want easier logistics?");
  if (/rail|train|flight|airport|station|route/.test(haystack)) add("Can you compare rail and flight for this route?");
  if (/food|restaurant|dish|hotpot|spice/.test(haystack)) add("What should I order and what should I avoid?");
  add("Can you turn this into a day-by-day plan?");
  add("What should I book first?");
  add("What are the common mistakes to avoid?");
  return suggestions;
}

function renderFollowups(items = []) {
  const wrap = $("#followupSuggestions");
  if (!wrap) return;
  wrap.replaceChildren();
  wrap.classList.toggle("is-hidden", !items.length);
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "followup-button";
    button.dataset.followup = item;
    button.textContent = item;
    wrap.appendChild(button);
  });
}

async function sendChat(message, overrides = {}) {
  const settings = currentChatSettings(overrides);
  state.chat = { ...state.chat, ...settings };
  startChatExperience();
  renderFollowups();
  setStatus("#chatStatus", "Thinking through the route...");
  saveRecentQuestion(message);
  addMessage("You", message, "user");
  const target = addMessage("VisePanda", "");
  const targetMessage = target.closest(".message");
  const input = $("#chatInput");
  let completed = false;
  try {
    state.chat.isStreaming = true;
    if (input) input.disabled = true;
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetchWithTimeout("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ message, ...settings }),
    }, 22000);
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
        let payload;
        try {
          payload = JSON.parse(line.slice(5).trim());
        } catch {
          return;
        }
        if (payload.meta) {
          $(".message__author", targetMessage).textContent = "VisePanda";
          setStatus("#chatStatus", "Thinking...");
        }
        if (payload.token) target.textContent += payload.token;
      });
      $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    }
    completed = true;
  } catch (error) {
    target.textContent = "I could not reach the guide service. Please try again.";
    showToast(error.message, "error");
  } finally {
    state.chat.isStreaming = false;
    if (input) input.disabled = false;
    setStatus("#chatStatus", "");
    if (completed && target.textContent.trim()) renderFollowups(buildFollowups(message, target.textContent));
    if (window.matchMedia("(max-width: 560px)").matches) {
      document.body.classList.remove("is-chat-composing");
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    } else {
      input?.focus({ preventScroll: true });
    }
  }
}

function startChatExperience() {
  if (state.chat.hasStarted) return;
  state.chat.hasStarted = true;
  $("#panel-chat")?.classList.add("has-started");
  $("#chatWelcome")?.classList.add("is-hidden");
}

async function loadTrips() {
  const list = $("#tripList");
  try {
    if (!state.token) {
      const localTrips = getGuestTrips();
      setStatus("#tripStatus", localTrips.length ? "Guest trips are saved on this device." : "Guest mode: save a quick trip on this device.");
      list.replaceChildren(...(localTrips.length ? localTrips.map(tripCard) : [
        emptyState("No trips yet", "Save a draft here, or sign in later to sync across devices.", "Ask AI", () => setView("chat")),
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
  try {
    if (state.token) {
      await api("/api/trips", { method: "POST", body: JSON.stringify(body) });
    } else {
      const trips = JSON.parse(localStorage.getItem("vp_guest_trips") || "[]");
      trips.unshift({ ...body, id: Date.now() });
      localStorage.setItem("vp_guest_trips", JSON.stringify(trips.slice(0, 12)));
    }
  } catch (error) {
    showToast(error.message, "error");
    throw error;
  }
  form.reset();
  loadDashboard();
  await loadTrips();
  showToast("Trip saved");
}

function updateAuthUi() {
  const signedIn = Boolean(state.user);
  const verifying = state.authMode === "verify" && !signedIn;
  $("#authTitle").textContent = signedIn ? "Profile" : verifying ? "Verify email" : state.authMode === "login" ? "Sign in" : "Create account";
  $("#authStatus").textContent = signedIn
    ? `Signed in as ${state.user.email}`
    : verifying
      ? `Enter the code sent to ${state.pendingEmail || "your email"}.`
      : state.authMode === "login"
        ? "Use your email and password, or continue with Google."
        : "Create an account with email and password. We will send a verification code.";
  $("#authButton").title = signedIn ? state.user.email : "Account";
  $("#authForm").classList.toggle("is-hidden", signedIn || verifying);
  $("#verifyForm").classList.toggle("is-hidden", !verifying);
  $("#profileForm").classList.toggle("is-hidden", !signedIn);
  $("#toggleAuthMode").textContent = state.authMode === "login" ? "Create an account" : "Sign in instead";
  $("#googleLogin").classList.toggle("is-hidden", !state.authConfig.google);
  if (verifying && state.pendingEmail) {
    $("#verifyForm").elements.email.value = state.pendingEmail;
  }
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
    showToast("Your session expired. Please sign in again.", "error");
  }
  updateAuthUi();
}

function handleAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get("auth_error");
  if (authError) showToast(authError, "error");
  if (params.get("auth") === "google") showToast("Signed in with Google");
  if (authError || params.get("auth")) {
    history.replaceState({}, "", window.location.pathname);
  }
}

function bindEvents() {
  $$(".nav__item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  $$("[data-view='dashboard']:not(.nav__item)").forEach((button) => button.addEventListener("click", () => setView("dashboard")));
  $("#mobileAskButton").addEventListener("click", () => {
    setView("chat");
    setTimeout(() => $("#chatInput")?.focus(), 180);
  });
  $$("[data-prompt]").forEach((button) => button.addEventListener("click", async () => {
    setView("chat");
    await sendChat(button.dataset.prompt, { mode: button.dataset.mode, depth: button.dataset.depth });
  }));
  $("#followupSuggestions").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-followup]");
    if (!button || state.chat.isStreaming) return;
    await sendChat(button.dataset.followup);
  });
  $("#mapAskButton").addEventListener("click", async () => {
    setView("chat");
    await sendChat("Help me compare the best China route by map logic, including rail, flight, and transfer difficulty.", { mode: "transit", depth: "expert" });
  });
  $("#translationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    translateText($("#translationInput").value);
  });
  $("#swapTranslationDirection").addEventListener("click", () => {
    state.translationDirection = state.translationDirection === "auto" ? "en-zh" : state.translationDirection === "en-zh" ? "zh-en" : "auto";
    setStatus("#translateStatus", `Direction: ${state.translationDirection === "auto" ? "auto detect" : state.translationDirection === "en-zh" ? "English to Chinese" : "Chinese to English"}.`);
  });
  $("#burnTranslationHistory").addEventListener("click", () => {
    localStorage.removeItem("vp_translation_history");
    renderTranslationHistory();
    showToast("Translation history cleared");
  });
  $("#voiceTranslateButton").addEventListener("click", () => {
    const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!speechRecognition || !window.speechSynthesis) {
      setStatus("#translateStatus", "Voice translation needs browser speech recognition and speech synthesis. Text translation is ready.", "error");
      return;
    }
    setStatus("#translateStatus", "Voice tools are available in this browser. Full push-to-talk flow is planned for the next build.");
  });
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
  $("#chatInput").addEventListener("focus", () => document.body.classList.add("is-chat-composing"));
  $("#chatInput").addEventListener("blur", () => document.body.classList.remove("is-chat-composing"));
  $("#quickPlanner").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const button = event.currentTarget.querySelector("button");
    setView("chat");
    const length = values.length || values.duration || "7 days";
    await withButtonBusy(button, "Asking", () => sendChat(`Plan a ${length} China trip for ${values.destination || "a first-time visitor"}.`));
  });
  $("#tripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    await withButtonBusy(button, "Saving", () => saveTrip(form));
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
  $("#backToSignIn").addEventListener("click", () => {
    state.authMode = "login";
    updateAuthUi();
  });
  $("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const endpoint = state.authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const button = form.querySelector("button[type='submit']");
    await withButtonBusy(button, "Working", async () => {
      try {
        const data = await api(endpoint, { method: "POST", body: JSON.stringify(body) });
        let message = "Account ready";
        if (data.token) {
          state.token = data.token;
          sessionStorage.setItem("vp_token", state.token);
          state.user = data.user;
        } else if (data.requiresVerification) {
          state.pendingEmail = data.email || body.email;
          state.authMode = "verify";
          $("#verifyForm").elements.code.value = data.verificationCode || "";
          message = data.delivery === "sent" ? "Verification code sent" : "Verification code ready";
        } else {
          state.authMode = "login";
          const login = await api("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
          state.token = login.token;
          sessionStorage.setItem("vp_token", state.token);
          state.user = login.user;
        }
        form.reset();
        updateAuthUi();
        showToast(message);
      } catch (error) {
        if (error.message.includes("Verify your email")) {
          state.pendingEmail = body.email;
          state.authMode = "verify";
          updateAuthUi();
        }
        showToast(error.message, "error");
      }
    });
  });
  $("#verifyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector("button[type='submit']");
    await withButtonBusy(button, "Verifying", async () => {
      try {
        const data = await api("/api/auth/verify-email", { method: "POST", body: JSON.stringify(body) });
        state.token = data.token;
        sessionStorage.setItem("vp_token", state.token);
        state.user = data.user;
        state.pendingEmail = "";
        form.reset();
        updateAuthUi();
        showToast("Email verified");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  $("#resendVerification").addEventListener("click", async (event) => {
    const email = $("#verifyForm").elements.email.value || state.pendingEmail;
    await withButtonBusy(event.currentTarget, "Sending", async () => {
      try {
        const data = await api("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
        state.pendingEmail = data.email || email;
        if (data.verificationCode) $("#verifyForm").elements.code.value = data.verificationCode;
        updateAuthUi();
        showToast(data.delivery === "sent" ? "Verification code sent" : "Verification code ready");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  $("#profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector("button[type='submit']");
    await withButtonBusy(button, "Updating", async () => {
      try {
        const data = await api("/api/auth/update-profile", { method: "POST", body: JSON.stringify(body) });
        state.user = data.user;
        form.elements.currentPassword.value = "";
        form.elements.newPassword.value = "";
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
  handleAuthReturn();
  bindEvents();
  setView("chat");
  Promise.all([loadCities(), restoreSession(), loadChatOptions(), loadAuthConfig(), loadTranslations()]).catch(() => {});
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
