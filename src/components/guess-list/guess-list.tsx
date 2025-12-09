// src/components/guess-list.tsx
import { CardItem } from './card-item';
import { Country } from '../../data/countries/countries';
import { GameStatus } from '../../constants';

type GuessListProps = {
  guesses: string[];
  countries: Country[];       // used to look up guessCountry
  guessCount: number;
  country: Country;           // today's correct country
  gameStatus: GameStatus;
};

export function GuessList({
  guesses,
  countries,
  guessCount,
  country,
  gameStatus,
}: GuessListProps) {

  return (
    <>
      {guesses.map((guess, index) => {
        const isNew = index === guessCount - 1 && gameStatus === GameStatus.Playing;
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
            className={isNew ? 'new-guess guess-item' : 'guess-item'}
          />
        );
      })}
    </>
  );
}

export default GuessList;
