// src/components/guess-list/guess-list.tsx
import { Box, Flex, Text } from '@mantine/core';
import { GuessItem } from './guess-item';
import { Country } from '../../data/countries/countries';
import { GameStatus } from '../../constants';
import { BASE_CELL_STYLE, GUESS_GRID } from './grid';

type GuessListProps = {
  guesses: string[];
  countries: Country[];
  guessCount: number;
  country: Country;
  gameStatus: GameStatus;
  endRevealDone?: boolean;
  onFinalRevealDone?: () => void;
};

export function GuessList({
  guesses,
  countries,
  guessCount,
  country,
  gameStatus,
  endRevealDone,
  onFinalRevealDone
}: GuessListProps) {
  const hasAnyGuess = guesses.some((g) => g && g.trim().length > 0);

  return (
    <Flex direction="column" gap={6} w="100%">
      {/* Header */}
      {hasAnyGuess && (
        <Box
          className='header-row'
          w="100%"
          style={{
            display: 'grid',
            gridTemplateColumns: GUESS_GRID,
            columnGap: 6,
          }}
        >
          <HeaderCell>Guess</HeaderCell>
          <HeaderCell>Distance</HeaderCell>
          <HeaderCell>Direction</HeaderCell>
          <HeaderCell>Proximity</HeaderCell>
        </Box>
      )}

      {/* Rows */}
      {guesses.map((guess, index) => {
        const isLatestGuess = index === guessCount - 1;
        const isFinalGuess =
          isLatestGuess && gameStatus !== GameStatus.Playing;

        const guessCountry =
          countries.find((c) => c.name === guess) || null;

        if (
          gameStatus !== GameStatus.Playing &&
          endRevealDone &&
          index >= guessCount
        ) {
          return null;
        }

        return (
          <GuessItem
            key={index}
            index={index}
            guess={guess}
            guessCountry={guessCountry}
            country={country}
            guessCount={guessCount}
            className="guess-item"
            onRevealDone={isFinalGuess ? onFinalRevealDone : undefined}
          />
        );
      })}
    </Flex>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      className='header-cell'
      style={{
        ...BASE_CELL_STYLE,
        height: 20,
        //textTransform: 'uppercase',
        opacity: 0.9,
        //letterSpacing: 0.3,
      }}
    >
      <Text size="xs">{children}</Text>
    </Box>
  );
}

export default GuessList;
