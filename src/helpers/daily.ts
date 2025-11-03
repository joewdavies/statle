// Use UTC so everyone gets the same puzzle globally.
const MS_PER_DAY = 86_400_000;
// Pick a fixed epoch you won't change later.
const EPOCH_UTC = Date.UTC(2025, 0, 1); // 2025-01-01

export function todayKeyUTC(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // e.g. "2025-11-03"
}

export function dayIndexUTC(d = new Date()): number {
  // Truncate to UTC midnight
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((t - EPOCH_UTC) / MS_PER_DAY);
}

// Deterministic daily index over a *stable* country list.
// IMPORTANT: use a stable ordering (e.g., ISO code) when calling this.
export function dailyIndex(listLength: number, d = new Date()): number {
  const idx = dayIndexUTC(d);
  // Optional fixed rotation offset if you want to shift the start point:
  const OFFSET = 0;
  return ((idx + OFFSET) % listLength + listLength) % listLength;
}

export function finishedKeyFor(key: string) {
  return `statle:daily:${key}:finished`; // value: "won" | "lost"
}
export function stateKeyFor(key: string) {
  return `statle:daily:${key}:state`;     // your serialized in-progress guesses if you want
}
