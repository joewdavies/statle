import { useState, useMemo, useEffect } from 'react';
import { ProximityRevealBar } from './proximity-reveal-bar';
import { convertDistance, getDistance } from 'geolib';
import { dataset } from '../../data/stats/dataset';
import { Country } from '../../data/countries/countries';
import { GuessRow } from './guess-row';
import { useMantineColorScheme } from '@mantine/core';

export type GuessItemProps = {
  index: number;
  guess: string;
  guessCountry: Country | null;
  country: Country;
  guessCount: number;
  className?: string;
  onRevealDone?: () => void;
};

export const GuessItem = ({
  index,
  guess,
  guessCountry,
  country,
  guessCount,
  className,
  onRevealDone,
}: GuessItemProps) => {
  const isNew = index === guessCount - 1;
  const isEmpty = guess === '';
  const { colorScheme } = useMantineColorScheme();
  const [revealed, setRevealed] = useState(true);

  // reset when this becomes the active guess
  useEffect(() => {
    if (isNew) setRevealed(false);
  }, [isNew]);

  const { proximity } = useMemo(() => {
  if (!guessCountry) {
    return { proximity: 0 };
  }

  const meters = getDistance(
    { latitude: guessCountry.latitude, longitude: guessCountry.longitude },
    { latitude: country.latitude, longitude: country.longitude }
  );

  const km = convertDistance(meters, 'km');

  return {
    distanceKm: Math.round(km),
    proximity: Math.max(0, Math.min(100, 100 - (km / 20000) * 100)),
  };
}, [guessCountry, country]);

  const bg =
    colorScheme === 'dark'
      ? 'var(--mantine-color-dark-5)'
      : 'var(--mantine-color-gray-1)';

  if (isEmpty) {
    return (
      <div
        className={className + ' empty-guess'}
        style={{
          width: '100%',
          height: 32,
          background: bg,
          borderRadius: 4,
        }}
      />
    );
  }

  return !revealed ? (
    <ProximityRevealBar
      proximity={proximity}
      onDone={() => {
        setRevealed(true);
        onRevealDone?.(); //  signal App
      }}
    />
  ) : (
    <GuessRow
      guessCountry={guessCountry!}
      country={country}
    />
  );
};

