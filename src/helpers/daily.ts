// Keep this — used only to divide UTC day numbers (24h constant).
const MS_PER_DAY = 86_400_000;

// Pick a fixed *calendar* epoch you won't change later.
// This is interpreted in the user's local calendar (Jan 1, 2025).
const EPOCH_LOCAL = { y: 2025, m: 0, d: 1 }; // months are 0-based

export function todayKeyLocal(d = new Date()): string {
  const y = d.getFullYear();                // LOCAL year
  const m = String(d.getMonth() + 1).padStart(2, '0'); // LOCAL month
  const day = String(d.getDate()).padStart(2, '0');    // LOCAL day
  return `${y}-${m}-${day}`; // e.g. "2025-11-07"
}

// Day index that increments at LOCAL midnight, but is DST-safe.
export function dayIndexLocal(d = new Date()): number {
  const y = d.getFullYear();         // LOCAL parts
  const m = d.getMonth();
  const day = d.getDate();

  // Convert those local calendar dates into UTC midnights to count days.
  const t = Date.UTC(y, m, day);
  const t0 = Date.UTC(EPOCH_LOCAL.y, EPOCH_LOCAL.m, EPOCH_LOCAL.d);
  return Math.floor((t - t0) / MS_PER_DAY);
}

// Deterministic daily index over a stable country list, using LOCAL reset.
export function dailyIndex(listLength: number, d = new Date()): number {
  const idx = dayIndexLocal(d);
  const OFFSET = 0;
  return ((idx + OFFSET) % listLength + listLength) % listLength;
}

// Storage keys now based on LOCAL date key
export function finishedKeyFor(key: string) {
  return `statle:daily:${key}:finished`; // "won" | "lost"
}
export function stateKeyFor(key: string) {
  return `statle:daily:${key}:state`;
}

// (Optional) helper for countdowns/UI
export function msUntilLocalReset(d = new Date()): number {
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return nextMidnight.getTime() - d.getTime();
}