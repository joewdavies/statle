import { Flex, Text } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { CardItem } from './components/card-item';
import { CorrectCountry } from './components/correct-country';
import { StatClues } from './components/stat-clues';
import { Navbar } from './components/navbar';
import { SelectCountry } from './components/select-country';
import { GameStatus, MAX_GUESSES } from './constants';
import { countries } from './data/countries/countries';
import { useUserStats } from './hooks/useUserStats';
import { CountryCardHeader } from './components/country-card';
import { dailyIndex, todayKeyUTC, finishedKeyFor, stateKeyFor } from './helpers/daily';

// stats
import { stats } from './data/stats/stats';
import { GameResult, UserStatsService } from './services/userStats';

// Build a stable ordering so today's index is deterministic forever
const STABLE_COUNTRIES = [...countries].sort((a, b) =>
  (a.code || '').localeCompare(b.code || '')
);

// Compute today's keys/answer (UTC)
const todayKey = todayKeyUTC();
const answerIndex = dailyIndex(STABLE_COUNTRIES.length);
const todaysCountry = STABLE_COUNTRIES[answerIndex];

// Storage keys for today
const TODAY_STATE_KEY = stateKeyFor(todayKey);
const TODAY_FINISHED_KEY = finishedKeyFor(todayKey);

// 🧹 one-time cleanup of *exact* duplicates (same content; keep latest finishedAt)
const sortByDateAscLocal = (a: GameResult, b: GameResult) =>
  a.date !== b.date ? a.date.localeCompare(b.date) : a.finishedAt - b.finishedAt;

(function dedupeStatleHistoryV1() {
  const KEY = 'statleHistory.v1';
  const raw = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (!raw) return;
  try {
    const file = JSON.parse(raw) as { v: 1; items: GameResult[] };
    if (file?.v !== 1 || !Array.isArray(file.items)) return;

    const keyOf = (g: GameResult) =>
      [g.date, g.countryCode, g.countryName, g.result, g.guessCount, ...g.guesses].join('§');

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
})();

type PersistedRound = {
  // minimal per-day state
  guesses: string[];
  guessCount: number;
  gameStatus: GameStatus;
};

function App() {
  // ==== Load today's persisted state (if any) ====
  const persisted: PersistedRound | null = useMemo(() => {
    try {
      const raw = localStorage.getItem(TODAY_STATE_KEY);
      return raw ? (JSON.parse(raw) as PersistedRound) : null;
    } catch {
      return null;
    }
  }, []);

  const finishedVal = typeof window !== 'undefined' ? localStorage.getItem(TODAY_FINISHED_KEY) : null;

  // ==== Country is always today's country in daily mode ====
  const [country] = useState(todaysCountry);

  // ==== Round state (initialized from persisted daily state or defaults) ====
  const [value, setValue] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>(
    persisted?.guesses ?? Array(MAX_GUESSES).fill('')
  );
  const [guessCount, setGuessCount] = useState<number>(persisted?.guessCount ?? 0);
  const [gameStatus, setGameStatus] = useState<GameStatus>(() => {
    if (finishedVal === 'won') return GameStatus.Won;
    if (finishedVal === 'lost') return GameStatus.Lost;
    return persisted?.gameStatus ?? GameStatus.Playing;
  });

  // ==== Persist today's round to per-day key ====
  useEffect(() => {
    const payload: PersistedRound = {
      guesses,
      guessCount,
      gameStatus,
    };
    localStorage.setItem(TODAY_STATE_KEY, JSON.stringify(payload));
  }, [guesses, guessCount, gameStatus]);

  // ==== When the game ends, mark today finished + upsert to history ====
  const { upsert: upsertUserStats } = useUserStats(MAX_GUESSES);

  useEffect(() => {
    if (gameStatus === GameStatus.Playing) return;

    // Mark finished for today so user can't replay
    if (gameStatus === GameStatus.Won) {
      localStorage.setItem(TODAY_FINISHED_KEY, 'won');
    } else if (gameStatus === GameStatus.Lost) {
      localStorage.setItem(TODAY_FINISHED_KEY, 'lost');
    }

    // Record today’s result in user stats/history
    const record = UserStatsService.buildRecord({
      countryCode: country.code,
      countryName: country.name,
      result: gameStatus === GameStatus.Won ? 'won' : 'lost',
      guesses: guesses.filter(Boolean).slice(0, guessCount),
      // date is set inside buildRecord to "today" already; if you need UTC date string use todayKey
    });
    upsertUserStats(record);
  }, [gameStatus, guessCount, guesses, country.code, country.name, upsertUserStats]);

  // ==== Optional: refresh app when UTC day rolls over ====
  useEffect(() => {
    const id = setInterval(() => {
      const keyNow = todayKeyUTC();
      if (keyNow !== todayKey) {
        window.location.reload();
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // statistical data (static for now)
  const statsByCode = stats;

  // Helper: do we have any non-empty guesses?
  const hasAnyGuess = guesses.some((g) => g && g.trim().length > 0);

  return (
    <Flex align="center" direction="column" gap={20}>
      <Navbar />
      <Text>Guess today's country!</Text>

      <StatClues
        country={country}
        guessCount={guessCount}
        gameEnded={gameStatus !== GameStatus.Playing}
        statsByCode={statsByCode}
      />

      {gameStatus === GameStatus.Playing && (
        <SelectCountry
          countries={countries}
          country={country}
          value={value}
          setValue={setValue}
          guesses={guesses}
          setGuesses={setGuesses}
          guessCount={guessCount}
          setGuessCount={setGuessCount}
          gameStatus={gameStatus}
          setGameStatus={setGameStatus}
        />
      )}

      {gameStatus !== GameStatus.Playing && (
        // In daily mode, CorrectCountry should disable/hide “Play again”
        <CorrectCountry country={country} gameStatus={gameStatus} dailyMode />
      )}

      {/* Header + guess list */}
      <Flex direction="column" gap={8} w="100%" align="center">
        {hasAnyGuess && <CountryCardHeader />}
        {guesses.length === 0 && <h1>No guesses</h1>}
        {guesses.map((guess, index) => {
          const guessCountry = countries.find((c) => c.name === guess);
          if (gameStatus === GameStatus.Won && index >= guessCount) return null;
          return (
            <CardItem
              key={index}
              index={index}
              guessCount={guessCount}
              guess={guess}
              guessCountry={guessCountry}
              country={country}
            />
          );
        })}
      </Flex>
    </Flex>
  );
}

export default App;
