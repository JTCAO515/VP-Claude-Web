async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "Request failed");
  }
  return data;
}

export const api = {
  health: () => request("/api/health"),
  cities: (featured) => request(`/api/cities${featured ? "?featured=1" : ""}`),
  city: (id) => request(`/api/cities/${id}`),
  hotels: (city = "") => request(`/api/hotels/search?city=${encodeURIComponent(city)}`),
  deals: (city = "") => request(`/api/deals/search?city=${encodeURIComponent(city)}`),
  tools: () => request("/api/tools"),
  mapSearch: (q) => request(`/api/maps/place?q=${encodeURIComponent(q)}`),
  translations: (category, q = "") =>
    request(`/api/translations?category=${category}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  chat: (message, hist) =>
    request("/api/chat", { method: "POST", body: JSON.stringify({ message, history: hist }) }),
};

export async function chatStream(message, hist, onDelta) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: hist, stream: true }),
  });
  if (!response.ok || !response.body) {
    const fallback = await response.json().catch(() => ({}));
    onDelta(fallback.answer || "I could not reach the guide service.");
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop();
    for (const event of events) {
      const line = event.replace(/^data:\s*/, "");
      if (line === "[DONE]" || !line) continue;
      try {
        const payload = JSON.parse(line);
        if (payload.delta) onDelta(payload.delta);
      } catch {
        /* ignore malformed SSE chunk */
      }
    }
  }
}
