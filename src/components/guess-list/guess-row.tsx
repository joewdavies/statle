import { Box, Text, useMantineColorScheme } from '@mantine/core';
import { Country } from '../../data/countries/countries';
import { convertDistance, getDistance } from 'geolib';
import { getCompassDirection, directionMap, sharesLandBorder } from '../../services/geo';
import { dataset } from '../../data/stats/dataset';
import { BASE_CELL_STYLE, GUESS_GRID } from './grid';

type Props = {
  guessCountry: Country;
  country: Country;
};

export function GuessRow({ guessCountry, country }: Props) {
  const { colorScheme } = useMantineColorScheme();

  const isBordering = sharesLandBorder(
    guessCountry.code,
    country.code,
    dataset
  );

  const distance = isBordering
    ? 1
    : Math.round(
      convertDistance(
        getDistance(
          { latitude: guessCountry.latitude, longitude: guessCountry.longitude },
          { latitude: country.latitude, longitude: country.longitude }
        ),
        'km'
      )
    );

  const direction = getCompassDirection(
    { latitude: guessCountry.latitude, longitude: guessCountry.longitude },
    { latitude: country.latitude, longitude: country.longitude }
  );

  const proximity = Math.max(0, Math.min(100, 100 - (distance / 20000) * 100));

  const border =
    colorScheme === 'dark'
      ? 'var(--mantine-color-dark-4)'
      : 'var(--mantine-color-gray-2)';

  const cellStyle = {
    ...BASE_CELL_STYLE,
    height: 36,
    border: `1px solid ${border}`,
    background: 'transparent',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const spaceAsThousandSeparator = function (number: number) {
    return number.toLocaleString('en').replace(/,/gi, ' ')
  }

  const isCorrect = guessCountry.code === country.code;

  return (
    <Box
      w="100%"
      className={isCorrect ? "guess-row correct-row" : "guess-row"}
      style={{
        display: 'grid',
        gridTemplateColumns: GUESS_GRID,
        columnGap: 0,
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      {/* Country */}
      <Box style={cellStyle}  className={isCorrect ? "guess-cell correct-cell" : "guess-cell"}>
        <Text size="sm" truncate>{guessCountry.name}</Text>
      </Box>

      {/* Distance */}
      <Box style={cellStyle} className={isCorrect ? "guess-cell correct-cell" : "guess-cell"}>
        <Text size="sm">{spaceAsThousandSeparator(distance)}km</Text>
      </Box>

      {/* Direction */}
      <Box style={cellStyle} className={isCorrect ? "guess-cell correct-cell" : "guess-cell"} >
        <Text size="sm">{isCorrect ? '🎉' : directionMap[direction] || '🧭'}</Text>
      </Box>

      {/* Proximity */}
      <Box style={cellStyle} className={isCorrect ? "guess-cell correct-cell" : "guess-cell"}>
        <Text size="sm">{Math.round(proximity)}%</Text>
      </Box>
    </Box>
  );
}
