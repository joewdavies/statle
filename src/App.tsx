import { Flex } from '@mantine/core';
import { useEffect, useState } from 'react';
import './App.css';
import { CardItem } from './components/card-item';
import { CorrectCountry } from './components/correct-country';
// import { CountryMap } from './components/country-map'; // ← not used anymore
import { StatClues } from './components/stat-clues';
import { Navbar } from './components/navbar';
import { SelectCountry } from './components/select-country';
import { GameStatus, MAX_GUESSES } from './constants';
import { countries, countriesMap } from './data/countries';
import { getRandomCountry } from './helpers/getRandomCountry';

// NEW: types + Eurostat service
import type { CountryStats } from './types';
import { getAllStats } from './services/eurostat';

function App() {
  const storedCountryCode = localStorage.getItem('country');
  const initialCountry = storedCountryCode
    ? countriesMap.get(storedCountryCode)!
    : getRandomCountry();

  const [value, setValue] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>(
    JSON.parse(
      localStorage.getItem('guesses') ||
        JSON.stringify(Array(MAX_GUESSES).fill(''))
    )
  );
  const [guessCount, setGuessCount] = useState<number>(
    JSON.parse(localStorage.getItem('guessCount') || JSON.stringify(0))
  );
  const [gameStatus, setGameStatus] = useState<GameStatus>(
    JSON.parse(
      localStorage.getItem('gameStatus') || JSON.stringify(GameStatus.Playing)
    )
  );

  // NEW: fetched stats (daily-cached in localStorage by the service)
  const [statsByCode, setStatsByCode] = useState<Record<string, CountryStats> | null>(null);

  useEffect(() => {
    localStorage.setItem('country', initialCountry.code);
    localStorage.setItem('guesses', JSON.stringify(guesses));
    localStorage.setItem('guessCount', JSON.stringify(guessCount));
    localStorage.setItem('gameStatus', JSON.stringify(gameStatus));
  }, [guesses, guessCount, gameStatus, initialCountry?.code]);

  // NEW: fetch Eurostat stats once
  useEffect(() => {
    (async () => {
      const all = await getAllStats(countries, { force: true }); // bypasses cache
      setStatsByCode(all);
    })();
  }, []);

  return (
    <Flex align="center" direction={'column'} gap={32}>
      <Navbar />

      <StatClues
        country={initialCountry}
        guessCount={guessCount}
        gameEnded={gameStatus !== GameStatus.Playing}
        // NEW: pass fetched stats down; your StatClues should accept this prop
        statsByCode={statsByCode}
      />

      {gameStatus === GameStatus.Playing && (
        <SelectCountry
          countries={countries}
          country={initialCountry}
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
        <CorrectCountry country={initialCountry} gameStatus={gameStatus} />
      )}

      <Flex direction={'column'} gap={8} w={'100%'} align={'center'}>
        {guesses.length === 0 && <h1>No guesses</h1>}
        {guesses.map((guess, index) => {
          const guessCountry = countries.find((country) => country.name === guess);
          if (gameStatus === GameStatus.Won && index >= guessCount) return null;
          return (
            <CardItem
              key={index}
              index={index}
              guessCount={guessCount}
              guess={guess}
              guessCountry={guessCountry}
              country={initialCountry}
            />
          );
        })}
      </Flex>
    </Flex>
  );
}

export default App;
