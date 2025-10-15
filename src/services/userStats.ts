// Simple, versioned, localStorage-backed service for past games

export type GameResult = {
  date: string;                // "YYYY-MM-DD" (seed/day id)
  countryCode: string;
  countryName: string;
  result: "won" | "lost";
  guesses: string[];           // ordered guess names/codes
  guessCount: number;          // number of guesses used
  finishedAt: number;          // epoch ms
};

type HistoryFile = {
  v: 1;
  items: GameResult[];
};

const HISTORY_KEY_V1 = "statleHistory.v1";
const LEGACY_KEY = "statleHistory"; // auto-migrate if present

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readRaw(): HistoryFile {
  // migrate legacy (array only) → v1
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy && !localStorage.getItem(HISTORY_KEY_V1)) {
    try {
      const items = JSON.parse(legacy) as GameResult[];
      const migrated: HistoryFile = { v: 1, items: Array.isArray(items) ? items : [] };
      localStorage.setItem(HISTORY_KEY_V1, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    } catch {
      // fall through
    }
  }

  const raw = localStorage.getItem(HISTORY_KEY_V1);
  if (!raw) return { v: 1, items: [] };

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v === 1 && Array.isArray(parsed.items)) return parsed as HistoryFile;
  } catch {}
  // If corrupted, reset:
  return { v: 1, items: [] };
}

function writeRaw(file: HistoryFile) {
  localStorage.setItem(HISTORY_KEY_V1, JSON.stringify(file));
}

function sortByDateAsc(a: GameResult, b: GameResult) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.finishedAt - b.finishedAt;
}

export const UserStatsService = {
  /** Return full history (sorted ascending by date). */
  getAll(): GameResult[] {
    const f = readRaw();
    return [...f.items].sort(sortByDateAsc);
  },

  /** Replace or append a game by date (one game per day/seed). */
  upsert(game: GameResult) {
    const f = readRaw();
    const idx = f.items.findIndex((g) => g.date === game.date);
    if (idx >= 0) f.items[idx] = game;
    else f.items.push(game);
    writeRaw(f);
  },

  /** Convenience for building a game record quickly. */
  buildRecord({
    countryCode,
    countryName,
    result,
    guesses,
    finishedAt = Date.now(),
    date = todayStr(),
  }: Partial<GameResult> & Pick<GameResult, "countryCode" | "countryName" | "result" | "guesses">): GameResult {
    return {
      date,
      countryCode,
      countryName,
      result,
      guesses,
      guessCount: guesses.length,
      finishedAt,
    };
  },

  removeByDate(date: string) {
    const f = readRaw();
    f.items = f.items.filter((g) => g.date !== date);
    writeRaw(f);
  },

  clear() {
    writeRaw({ v: 1, items: [] });
  },

  /** Aggregate stats for UI. */
  getStats(maxGuesses: number) {
    const list = UserStatsService.getAll();
    const played = list.length;
    const wins = list.filter((g) => g.result === "won").length;
    const winRate = played ? wins / played : 0;

    // streaks (contiguous wins if you play multiple same-day entries they still count in order)
    let current = 0;
    let max = 0;
    for (const g of list) {
      if (g.result === "won") {
        current += 1;
        if (current > max) max = current;
      } else {
        current = 0;
      }
    }
    // current streak is the tail run of wins from end:
    let tail = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].result === "won") tail += 1;
      else break;
    }

    // guess distribution (wins only)
    const dist = new Array(Math.max(1, maxGuesses)).fill(0);
    for (const g of list) {
      if (g.result === "won" && g.guessCount >= 1 && g.guessCount <= dist.length) {
        dist[g.guessCount - 1] += 1;
      }
    }

    return {
      played,
      wins,
      winRate,           // 0..1
      currentStreak: tail,
      maxStreak: max,
      guessDistribution: dist, // length maxGuesses
      lastGame: list[list.length - 1] ?? null,
    };
  },
};
