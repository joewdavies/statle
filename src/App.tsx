import { Flex, Text, useMantineColorScheme } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { CorrectCountry } from './components/correct-country';
import { StatClues } from './components/stats-list/stat-clues';
import { Navbar } from './components/navbar/navbar';
import { SelectCountry } from './components/select-country/select-country';
import { GameStatus, MAX_GUESSES } from './constants';
import { countries } from './data/countries/countries';
import { useUserStats } from './hooks/useUserStats';
import { notifications } from '@mantine/notifications';

import {
  todayKeyLocal,
  finishedKeyFor,
  stateKeyFor,
  msUntilLocalReset,
} from './helpers/daily';
import Snowfall from 'react-snowfall';


// stats
import { stats } from './data/stats/stats';
import { GameResult, UserStatsService } from './services/userStats';

import { getDailyCountry } from "./helpers/getRandomCountry";
import GlobeJourney from './components/globe/globe-journey';
import GuessList from './components/guess-list/guess-list';
import ConfettiExplosion from 'react-confetti-explosion';
// import { CheatDetector } from "./components/cheat-detector";

const todaysCountry = getDailyCountry();
const todayKey = todayKeyLocal();

// Storage keys for today
const TODAY_STATE_KEY = stateKeyFor(todayKey);
const TODAY_FINISHED_KEY = finishedKeyFor(todayKey);

const christmas =
  (new Date().getMonth() === 11 && new Date().getDate() >= 1) || // December (month 11)
  (new Date().getMonth() === 0 && new Date().getDate() <= 7);   // January (month 0)

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
      console.info(
        `🧹 Statle: deduped exact duplicates (${file.items.length} → ${deduped.length})`
      );
    }
  } catch { }
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
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(TODAY_STATE_KEY);
      return raw ? (JSON.parse(raw) as PersistedRound) : null;
    } catch {
      return null;
    }
  }, []);

  const finishedVal =
    typeof window !== 'undefined' ? localStorage.getItem(TODAY_FINISHED_KEY) : null;

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
  const [endRevealDone, setEndRevealDone] = useState(false);

  // ==== Persist today's round to per-day key ====
  useEffect(() => {
    if (typeof window === 'undefined') return;
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

    if (typeof window !== 'undefined') {
      // Mark finished for today so user can't replay
      if (gameStatus === GameStatus.Won) {
        localStorage.setItem(TODAY_FINISHED_KEY, 'won');
      } else if (gameStatus === GameStatus.Lost) {
        localStorage.setItem(TODAY_FINISHED_KEY, 'lost');
      }
    }

    // Record today’s result in user stats/history
    const record = UserStatsService.buildRecord({
      countryCode: country.code,
      countryName: country.name,
      result: gameStatus === GameStatus.Won ? 'won' : 'lost',
      guesses: guesses.filter(Boolean).slice(0, guessCount),
    });
    upsertUserStats(record);
  }, [gameStatus, guessCount, guesses, country.code, country.name, upsertUserStats]);

  // ==== Refresh app at LOCAL midnight ====
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ms = msUntilLocalReset();
    const id = window.setTimeout(() => {
      window.location.reload();
    }, ms + 1000); // small buffer

    return () => clearTimeout(id);
  }, []);

  // win/loss notifications
  useEffect(() => {
  if (gameStatus === GameStatus.Won && endRevealDone) {
    notifications.show({
      color: 'green',
      message: 'Nice job!',
      position: 'top-center',
    });
  }
}, [gameStatus, endRevealDone]);
  // win/loss notifications
useEffect(() => {
  if (gameStatus === GameStatus.Lost && endRevealDone) {
    notifications.show({
      color: 'red',
      message: 'Game over, try again tomorrow!',
      position: 'top-center',
    });
  }
}, [gameStatus, endRevealDone]);

  // statistical data (static for now)
  const statsByCode = stats;
  const { colorScheme } = useMantineColorScheme();

  return (
    <Flex align="center" direction="column" gap={15}>
      {/* {gameStatus === GameStatus.Playing && (<CheatDetector threshold={1200} />)} */}

      <Navbar />
      <Text>Guess today's country!</Text>


      <StatClues
        country={country}
        guessCount={guessCount}
        gameEnded={gameStatus !== GameStatus.Playing}
        revealAll={gameStatus !== GameStatus.Playing && endRevealDone}
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
          setGameStatus={setGameStatus}
        />
      )}

      {/* Win */}
      {gameStatus === GameStatus.Won && endRevealDone && (
        <>
          {<ConfettiExplosion />}
          <CorrectCountry
            country={country}
            gameStatus={gameStatus}
            onPlayAgain={() => { }}
          />

          <Flex style={{ width: "100%", maxWidth: window.innerWidth }}>
            <GlobeJourney
              guesses={guesses
                .filter(Boolean)
                .map((g) => {
                  const found = countries.find((c) => c.name === g);
                  return found
                    ? {
                      code: found.code,
                      name: found.name,
                      latitude: found.latitude,
                      longitude: found.longitude,
                    }
                    : null;
                })
                .filter(Boolean) as Array<{
                  code?: string;
                  name?: string;
                  latitude: number;
                  longitude: number;
                }>}
              correctCountry={country} // pass correct country
            />
          </Flex>
        </>
      )}

      {/* Loss */}
      {gameStatus === GameStatus.Lost && endRevealDone && (
        <CorrectCountry
          country={country}
          gameStatus={gameStatus}
          onPlayAgain={() => { }}
        />
      )}

      {/* Guess list */}
      <GuessList
        guesses={guesses}
        countries={countries}
        guessCount={guessCount}
        country={country}
        gameStatus={gameStatus}
        endRevealDone={endRevealDone}
        onFinalRevealDone={() => setEndRevealDone(true)}
      />

      {/* snowfall */}
      {christmas && colorScheme == 'dark' && < Snowfall
        snowflakeCount={80}        // number of flakes
        color={colorScheme === "dark" ? "#ffffffff" : "#3c4349ff"} // or "#cce6ff" for a softer look
        radius={[0.5, 2.0]}        // size variation
        style={{
          position: 'absolute',
          width: '100%',
          height: '100dvh',
          zIndex: 0,
        }}
      />}
    </Flex>
  );
}

export default App;
