// src/utils/proximity.ts
export function proximityFromDistanceKm(distanceKm: number) {
  return Math.max(0, Math.min(100, 100 - (distanceKm / 20000) * 100));
}

export function proximityToCells5(proximity: number) {
  const greens = Math.round(proximity / 20); // 0–5
  return { greens, whites: 5 - greens };
}
