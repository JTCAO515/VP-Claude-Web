// Ratings — thin wrapper over /api/ratings (Amap POI data), with a
// fuzzy name-matcher so callers can attach a rating to a curated
// hotel/deal card without an exact-string match.

import { api } from './api.js';

export async function fetchRatings(cityId, category) {
  try {
    const data = await api.get(`/api/ratings?city=${encodeURIComponent(cityId)}&category=${encodeURIComponent(category)}`);
    return data.pois || [];
  } catch (_) {
    return [];
  }
}

export function matchRating(pois, name) {
  if (!name || !pois.length) return null;
  const found = pois.find((p) => p.name && (p.name.includes(name) || name.includes(p.name)));
  return found ? found.rating : null;
}

export function ratingBadge(rating) {
  if (rating == null) return '';
  return `<span class="badge cool" style="margin-left:6px">★ ${rating.toFixed(1)}</span>`;
}
