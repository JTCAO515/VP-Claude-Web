import { api } from "./api.js";
import { history } from "./store.js";
import { showToast } from "./toast.js";

let currentCategory = "phrases";

function fieldsFor(category, item) {
  if (category === "dining") {
    return { chinese: item.chinese, english: item.english, pinyin: item.pinyin, note: item.notes };
  }
  if (category === "attractions") {
    return { chinese: item.chinese, english: item.english, pinyin: item.pinyin, note: item.notes };
  }
  if (category === "culture") {
    return { chinese: item.chinese, english: item.english, pinyin: item.pinyin, note: item.notes };
  }
  return { chinese: item.chinese, english: item.english, pinyin: item.pinyin, note: item.use };
}

function phraseCard(category, item) {
  const fields = fieldsFor(category, item);
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <h3>${fields.chinese}</h3>
    <p>${fields.english}</p>
    <p class="muted">${fields.pinyin}</p>
    ${fields.note ? `<p class="muted">${fields.note}</p>` : ""}
  `;
  card.addEventListener("click", () => {
    history.add({ chinese: fields.chinese, english: fields.english, pinyin: fields.pinyin });
    renderHistory();
    showToast("Saved to history");
  });
  return card;
}

async function renderLibrary(category) {
  const container = document.querySelector("#phraseLibrary");
  container.innerHTML = `<p class="placeholder">Loading phrases…</p>`;
  try {
    const data = await api.translations(category);
    const items = data[category] || [];
    if (!items.length) {
      container.innerHTML = `<p class="placeholder">Nothing in this category yet.</p>`;
      return;
    }
    container.replaceChildren(...items.map((item) => phraseCard(category, item)));
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderHistory() {
  const list = document.querySelector("#historyList");
  const items = history.list();
  if (!items.length) {
    list.innerHTML = `<p class="placeholder">Your recent lookups will appear here.</p>`;
    return;
  }
  list.replaceChildren(
    ...items.map((entry) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<h3>${entry.chinese}</h3><p>${entry.english}</p><p class="muted">${entry.pinyin || ""}</p>`;
      return card;
    }),
  );
}

async function lookupAndRender(query, resultsEl) {
  resultsEl.innerHTML = `<p class="placeholder">Searching…</p>`;
  try {
    const matches = [
      ...(await api.translations("phrases", query)).phrases,
      ...(await api.translations("dining", query)).dining,
      ...(await api.translations("attractions", query)).attractions,
    ].filter(Boolean);
    if (!matches.length) {
      resultsEl.innerHTML = `<p class="placeholder">No match. Try a simpler English word like "taxi" or "spicy".</p>`;
      return null;
    }
    resultsEl.replaceChildren(...matches.slice(0, 8).map((item) => phraseCard("phrases", item)));
    return matches[0];
  } catch (error) {
    showToast(error.message, "error");
    return null;
  }
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function initVoice() {
  const status = document.querySelector("#voiceStatus");
  const button = document.querySelector("#voiceButton");
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasTTS = "speechSynthesis" in window;

  if (!SpeechRecognitionImpl || !hasTTS) {
    status.textContent = "This browser does not support voice translation yet. Use text translation below.";
    button.disabled = true;
    return;
  }

  status.textContent = "Voice translation is ready in this browser.";
  button.disabled = false;

  const recognition = new SpeechRecognitionImpl();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  let listening = false;

  recognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    status.textContent = `Heard: "${transcript}"`;
    const results = document.querySelector("#translateResults");
    const top = await lookupAndRender(transcript, results);
    if (top) speak(top.chinese);
  });

  recognition.addEventListener("error", () => {
    status.textContent = "Could not hear that clearly. Try again or use text translation.";
  });

  recognition.addEventListener("end", () => {
    listening = false;
    button.classList.remove("is-listening");
    button.textContent = "Hold to speak";
  });

  button.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
      return;
    }
    listening = true;
    button.classList.add("is-listening");
    button.textContent = "Listening…";
    status.textContent = "Listening — say an English word or phrase.";
    recognition.start();
  });
}

export function initTranslate() {
  initVoice();
  renderHistory();
  renderLibrary(currentCategory);

  document.querySelectorAll(".category-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".category-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      currentCategory = tab.dataset.category;
      renderLibrary(currentCategory);
    });
  });

  document.querySelector("#translateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.querySelector("#translateInput");
    const query = input.value.trim();
    if (!query) return;
    await lookupAndRender(query, document.querySelector("#translateResults"));
  });

  document.querySelector("#clearHistory").addEventListener("click", () => {
    history.clear();
    renderHistory();
  });
}
