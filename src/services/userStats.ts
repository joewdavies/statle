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
  } catch { }
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

function equalGameContent(a: GameResult, b: GameResult) {
  return (
    a.date === b.date &&
    a.countryCode === b.countryCode &&
    a.countryName === b.countryName &&
    a.result === b.result &&
    a.guessCount === b.guessCount &&
    a.guesses.length === b.guesses.length &&
    a.guesses.every((v, i) => v === b.guesses[i])
  );
}

export const UserStatsService = {
  /** Return full history (sorted ascending by date). */
  getAll(): GameResult[] {
    const f = readRaw();
    return [...f.items].sort(sortByDateAsc);
  },

  /** Append a game; if an *identical* game already exists, keep the one with the latest finishedAt. */
  upsert(game: GameResult) {
    const f = readRaw();

    // Find an existing *identical* record (ignoring finishedAt)
    const idx = f.items.findIndex(g => equalGameContent(g, game));
    if (idx >= 0) {
      // keep the one with the newer finishedAt
      if (game.finishedAt > f.items[idx].finishedAt) {
        f.items[idx] = game;
      }
      writeRaw(f);
      return;
    }

    // Optional tiny debounce: if the *last* game has same content except finishedAt
    const last = f.items[f.items.length - 1];
    if (last && equalGameContent(last, game)) {
      if (game.finishedAt > last.finishedAt) f.items[f.items.length - 1] = game;
      writeRaw(f);
      return;
    }

    // Otherwise, append
    f.items.push(game);
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
  getUserStats(maxGuesses: number) {
    const list = UserStatsService.getAll();
    const played = list.length;
    const wins = list.filter((g) => g.result === "won").length;
    const winRate = played ? wins / played : 0;

    // streaks across *all* games, including multiple per day
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
    // tail wins
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
      winRate,
      currentStreak: tail,
      maxStreak: max,
      guessDistribution: dist,
      lastGame: list[list.length - 1] ?? null,
    };
  },
};
