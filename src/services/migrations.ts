// src/services/migrations/dedupeHistoryV1.ts
import { GameResult } from "./userStats";

const sortByDateAscLocal = (a: GameResult, b: GameResult) =>
  a.date !== b.date ? a.date.localeCompare(b.date) : a.finishedAt - b.finishedAt;

export function dedupeStatleHistoryV1() {
  const KEY = "statleHistory.v1";
  const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  if (!raw) return;

  try {
    const file = JSON.parse(raw) as { v: 1; items: GameResult[] };
    if (file?.v !== 1 || !Array.isArray(file.items)) return;

    const keyOf = (g: GameResult) =>
      [g.date, g.countryCode, g.countryName, g.result, g.guessCount, ...g.guesses].join("§");

    const byKey: Record<string, GameResult> = {};
    for (const g of file.items) {
      const k = keyOf(g);
      const prev = byKey[k];
      if (!prev || g.finishedAt > prev.finishedAt) byKey[k] = g;
    }

    const deduped = Object.values(byKey).sort(sortByDateAscLocal);
    if (deduped.length !== file.items.length) {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, items: deduped }));
      console.info(`🧹 Statle: deduped exact duplicates (${file.items.length} → ${deduped.length})`);
    }
  } catch {}
}
