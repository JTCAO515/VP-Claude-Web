import { api } from "./api.js";
import { trips } from "./store.js";
import { showToast } from "./toast.js";

let loaded = false;

function cityCard(city) {
  const card = document.createElement("article");
  card.className = "city-card";
  if (city.image) {
    const img = document.createElement("img");
    img.src = city.image;
    img.alt = city.name_en;
    img.loading = "lazy";
    card.appendChild(img);
  }
  const body = document.createElement("div");
  body.className = "city-card__body";
  body.innerHTML = `<h3>${city.name_en}</h3><p>${city.best_season}</p>`;
  card.appendChild(body);
  card.addEventListener("click", () => showClimate(city));
  return card;
}

function showClimate(city) {
  const body = document.querySelector("#climateBody");
  body.innerHTML = `
    <p><strong>${city.name_en} (${city.name_cn})</strong></p>
    <p>${city.best_season} &middot; suggested stay: ${city.days}</p>
    <p class="muted">${city.budget_tip}</p>
  `;
}

function emptyOr(container, items, render) {
  if (!items.length) {
    container.innerHTML = `<p class="placeholder">Nothing to show yet.</p>`;
    return;
  }
  container.replaceChildren(...items.map(render));
}

function hotelCard(hotel) {
  const card = document.createElement("article");
  card.className = "card";
  const flags = [
    hotel.foreignerFriendly?.englishService && "English service",
    hotel.foreignerFriendly?.foreignCards && "Foreign cards",
  ].filter(Boolean);
  card.innerHTML = `
    <h3>${hotel.name}</h3>
    <p>${hotel.district} &middot; ${hotel.metroDistance}</p>
    ${flags.map((f) => `<span class="tag">${f}</span>`).join("")}
  `;
  return card;
}

function dealCard(deal) {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <h3>${deal.title}</h3>
    <p>${deal.city} &middot; ${deal.price}</p>
    <p class="muted">${deal.notes || ""}</p>
  `;
  return card;
}

function toolCard(tool) {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `<h3>${tool.title}</h3>${tool.items.slice(0, 3).map((item) => `<p>&middot; ${item}</p>`).join("")}`;
  return card;
}

function renderTrips() {
  const list = document.querySelector("#tripsList");
  const items = trips.list();
  if (!items.length) {
    list.innerHTML = `<p class="placeholder">No saved trips yet. Drafts stay on this device.</p>`;
    return;
  }
  list.replaceChildren(
    ...items.map((trip) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<h3>${trip.title}</h3><p>${trip.destination || "Destination not set"}</p>`;
      return card;
    }),
  );
}

export async function loadDashboard() {
  renderTrips();
  if (loaded) return;
  loaded = true;

  try {
    const { cities } = await api.cities(true);
    emptyOr(document.querySelector("#citiesRow"), cities, cityCard);
  } catch (error) {
    showToast(error.message, "error");
  }

  try {
    const { hotels } = await api.hotels();
    emptyOr(document.querySelector("#hotelsGrid"), hotels.slice(0, 6), hotelCard);
  } catch (error) {
    showToast(error.message, "error");
  }

  try {
    const { deals } = await api.deals();
    emptyOr(document.querySelector("#dealsGrid"), deals.slice(0, 6), dealCard);
  } catch (error) {
    showToast(error.message, "error");
  }

  try {
    const { tools } = await api.tools();
    emptyOr(document.querySelector("#toolsGrid"), tools, toolCard);
  } catch (error) {
    showToast(error.message, "error");
  }
}

export function initDashboard() {
  document.querySelector("#tripForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    trips.save(body);
    form.reset();
    renderTrips();
    showToast("Trip saved");
  });

  document.querySelector("#mapForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get("q");
    if (!q) return;
    const results = document.querySelector("#mapResults");
    results.innerHTML = `<p class="placeholder">Searching...</p>`;
    try {
      const { results: places } = await api.mapSearch(q);
      emptyOr(results, places, (place) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `<h3>${place.name}</h3><p>${place.address || ""}</p>`;
        return card;
      });
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}
