// src/App.tsx
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

// NEW: bring in the header that matches CountryCard’s grid
import { CountryCardHeader } from './components/country-card'; // ← from country-card.tsx

// stats
import { stats } from './data/stats/stats';

function App() {
  const storedCountryCode = localStorage.getItem('country');
  const initialCountry = storedCountryCode
    ? countriesMap.get(storedCountryCode)!
    : getRandomCountry();

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

  useEffect(() => {
    localStorage.setItem('country', initialCountry.code);
    localStorage.setItem('guesses', JSON.stringify(guesses));
    localStorage.setItem('guessCount', JSON.stringify(guessCount));
    localStorage.setItem('gameStatus', JSON.stringify(gameStatus));
  }, [guesses, guessCount, gameStatus, initialCountry?.code]);

  // statistical data
  // Either static:
  const statsByCode = stats; // synchronous, no state

  // Or dynamic:
  //const statsByCode = useCountryStats(true); // set true to bypass cache


  // Helper: do we have any non-empty guesses?
  const hasAnyGuess = guesses.some(g => g && g.trim().length > 0);

  return (
    <Flex align="center" direction="column" gap={20}>
      <Navbar />
      <Text>Guess the country!</Text>

      <StatClues
        country={initialCountry}
        guessCount={guessCount}
        gameEnded={gameStatus !== GameStatus.Playing}
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

      {/* Header + guess list */}
      <Flex direction="column" gap={8} w="100%" align="center">
        {/* Render header once when there’s at least one row to show */}
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
              country={initialCountry}
            />
          );
        })}
      </Flex>
    </Flex>
  );
}

export default App;
