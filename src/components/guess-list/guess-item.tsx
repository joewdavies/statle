import { useState, useMemo, useEffect } from 'react';
import { ProximityRevealBar } from './proximity-reveal-bar';
import { convertDistance, getDistance } from 'geolib';
import { countriesMap, Country } from '../../data/countries/countries';
import { GuessRow } from './guess-row';
import { useMantineColorScheme, Collapse, Box, Flex, Text, Group, UnstyledButton } from '@mantine/core';
import { buildClues, clueIcons } from '../stats-list/stat-clues';
import { useLanguage } from '../../hooks/useLanguage';
import { GameStatus } from '../../constants';
import { LandBorders } from '../stats-list/land-borders';

export type GuessItemProps = {
  index: number;
  guess: string;
  guessCountry: Country | null;
  country: Country;
  guessCount: number;
  className?: string;
  onRevealDone?: () => void;
  statsByCode?: Record<string, any>;
  gameStatus?: GameStatus;
  endRevealDone?: boolean;
};

export const GuessItem = ({
  index,
  guess,
  guessCountry,
  country,
  guessCount,
  className,
  onRevealDone,
  statsByCode,
  gameStatus,
  endRevealDone
}: GuessItemProps) => {
  const isNew = index === guessCount - 1;
  const isEmpty = guess === '';
  const { colorScheme } = useMantineColorScheme();
  const { t, language } = useLanguage();
  const [revealed, setRevealed] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // reset when this becomes the active guess
  useEffect(() => {
    if (isNew) setRevealed(false);
  }, [isNew]);

//proximity 
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
    proximity:
      km === 0
        ? 100
        : Math.max(0, Math.min(99, 100 - (km / 20000) * 100)),
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

  if (!revealed) {
    return (
      <ProximityRevealBar
        proximity={proximity}
        onDone={() => {
          setRevealed(true);
          onRevealDone?.(); //  signal App
        }}
      />
    );
  }

  // Calculate clues to show
  const gameEnded = gameStatus && gameStatus !== GameStatus.Playing;
  const revealAll = gameEnded && endRevealDone;
  const revealCount = revealAll ? 999 : Math.min(1 + guessCount, 999);
  
  const stats = guessCountry && statsByCode ? statsByCode[guessCountry.code] : null;
  const clues = buildClues(stats, t, language);
  const revealedClues = clues.slice(0, revealCount);

  return (
    <Box className={className}>
      <UnstyledButton 
        w="100%" 
        onClick={() => setIsExpanded(v => !v)}
        style={{ cursor: 'pointer', display: 'block' }}
      >
        <GuessRow
          guessCountry={guessCountry!}
          country={country}
        />
      </UnstyledButton>

      <Collapse in={isExpanded}>
        <Box 
          mt={4} 
          p="xs" 
          style={{ 
            background: bg, 
            borderRadius: 4,
            border: `1px solid ${colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)'}`
          }}
        >
          {revealedClues.length === 0 && (
            <Text size="sm" c="dimmed">{t("No stats available (yet).")}</Text>
          )}
          <Flex direction="column" gap={4}>
            {revealedClues.map((s, i) => (
              <Group key={i} gap="xs" wrap="nowrap">
                {clueIcons[s.key]}
                <Text size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Text span fw={600}>
                    {s.label}{s.key !== 'landlocked' ? ':' : ''}{' '}
                  </Text>
                  <Text span>
                    {s.key === "borders" ? (() => {
                      const codes = s.value as unknown as string[] | undefined;
                      if (!codes || codes.length === 0) return '';
                      const names = codes.map(c => {
                        const found = countriesMap.get(c);
                        if (!found) return c;
                        return language === 'es' && found.nameES ? found.nameES : found.name;
                      });
                      const joined = names.join(', ');
                      return joined.length <= 28 ? joined : <LandBorders borders={codes} />;
                    })() : (
                      s.value
                    )}
                  </Text>
                </Text>
              </Group>
            ))}
          </Flex>
        </Box>
      </Collapse>
    </Box>
  );
};

