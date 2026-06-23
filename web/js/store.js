const TRIPS_KEY = "vp_trips_v7";
const HISTORY_KEY = "vp_translate_history_v7";
const QUESTIONS_KEY = "vp_recent_questions_v7";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable, fail silently */
  }
}

export const trips = {
  list() { return read(TRIPS_KEY, []); },
  save(trip) {
    const items = trips.list();
    items.unshift({ ...trip, id: Date.now() });
    write(TRIPS_KEY, items.slice(0, 20));
    return items;
  },
};

export const history = {
  list() { return read(HISTORY_KEY, []); },
  add(entry) {
    const items = [entry, ...history.list().filter((item) => item.chinese !== entry.chinese)];
    write(HISTORY_KEY, items.slice(0, 30));
    return items;
  },
  clear() { write(HISTORY_KEY, []); },
};

export const recentQuestions = {
  list() { return read(QUESTIONS_KEY, []); },
  add(question) {
    const items = [question, ...recentQuestions.list().filter((q) => q !== question)];
    write(QUESTIONS_KEY, items.slice(0, 10));
    return items;
  },
};
