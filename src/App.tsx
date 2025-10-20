import { Flex, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import './App.css';
import { CardItem } from './components/card-item';
import { CorrectCountry } from './components/correct-country';
import { StatClues } from './components/stat-clues';
import { Navbar } from './components/navbar';
import { SelectCountry } from './components/select-country';
import { GameStatus, MAX_GUESSES } from './constants';
import { countries, countriesMap } from './data/countries/countries';
import { getRandomCountry } from './helpers/getRandomCountry';
import { useUserStats } from './hooks/useUserStats';
import { CountryCardHeader } from './components/country-card';

// reset helper that accepts setters
import { resetGame as resetGameHelper } from './helpers/resetGame';

// stats
import { stats } from './data/stats/stats';
import { UserStatsService } from './services/userStats';

function App() {
  // 1) Read any stored country just once for initial value
  const storedCountryCode = localStorage.getItem('country');
  const bootCountry = storedCountryCode
    ? countriesMap.get(storedCountryCode)!
    : getRandomCountry();

  // 2) ✅ Keep country in state (so we can swap it without reloading)
  const [country, setCountry] = useState(bootCountry);

  const [value, setValue] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>(
    JSON.parse(localStorage.getItem('guesses') || JSON.stringify(Array(MAX_GUESSES).fill('')))
  );
  const [guessCount, setGuessCount] = useState<number>(
    JSON.parse(localStorage.getItem('guessCount') || JSON.stringify(0))
  );
  const [gameStatus, setGameStatus] = useState<GameStatus>(
    JSON.parse(localStorage.getItem('gameStatus') || JSON.stringify(GameStatus.Playing))
  );

  // 3) Persist current round to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('country', country.code);
    localStorage.setItem('guesses', JSON.stringify(guesses));
    localStorage.setItem('guessCount', JSON.stringify(guessCount));
    localStorage.setItem('gameStatus', JSON.stringify(gameStatus));
  }, [country.code, guesses, guessCount, gameStatus]);

  // 4) When the game ends, upsert to history using the *current* state country
  const { upsert: upsertUserStats } = useUserStats(MAX_GUESSES);
  useEffect(() => {
    if (gameStatus === GameStatus.Playing) return;

    const record = UserStatsService.buildRecord({
      countryCode: country.code,
      countryName: country.name,
      result: gameStatus === GameStatus.Won ? "won" : "lost",
      guesses: guesses.filter(Boolean).slice(0, guessCount),
    });

    upsertUserStats(record);
  }, [gameStatus, guessCount, guesses, country.code, country.name]);

  // statistical data (static for now)
  const statsByCode = stats;

  // 5) Fast, no-reload reset wired to your helper
  const onPlayAgain = () =>
    resetGameHelper({
      setCountry,
      setGuesses,
      setGuessCount,
      setGameStatus,
      setInputValue: setValue,
      maxGuesses: MAX_GUESSES,
      // rng: getRandomCountry, // optional override
    });

  // Helper: do we have any non-empty guesses?
  const hasAnyGuess = guesses.some(g => g && g.trim().length > 0);

  return (
    <Flex align="center" direction="column" gap={20}>
      <Navbar />
      <Text>Guess the country!</Text>

      {/* ✅ pass the stateful country */}
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
        <CorrectCountry country={country} gameStatus={gameStatus} onPlayAgain={onPlayAgain} />
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
