// src/components/stat-clues.tsx
import { Alert, Badge, Box, Card, Flex, Group, Text } from '@mantine/core';
import { Country } from '../data/countries/countries';
import type { CountryStats } from '../data/stats/stats';

// ⬇️ Tabler icons (add/remove as you like)
import {
  IconUsers,
  IconHeartbeat,
  IconBriefcaseOff,
  IconCoins,
  IconRulerMeasure,
  IconSteeringWheel,
  IconTrees,
  IconCloudRain,
  IconPlane,
  IconLock,
  IconWheat,
  IconCloud,
  IconCurrencyDollar,
} from '@tabler/icons-react';

import { GiGoat } from "react-icons/gi";

type StatCluesProps = {
  country: Country;
  guessCount: number;
  gameEnded?: boolean; // reveal all stats at game end
  statsByCode?: Record<string, CountryStats> | null; // <-- NEW
};

// Keys for safer icon mapping
const clueIcons = {
  population: <IconUsers size={16} />,
  gdpPerCapita: <IconCurrencyDollar size={16} />,
  lifeExpectancy: <IconHeartbeat size={16} />,
  unemployment: <IconBriefcaseOff size={16} />,
  gdp: <IconCoins size={16} />,
  area: <IconRulerMeasure size={16} />,
  goats: <GiGoat size={16} />,
  carSide: <IconSteeringWheel size={16} />,
  forestArea: <IconTrees size={16} />,
  precipitation: <IconCloudRain size={16} />,
  co2: <IconCloud size={16} />, // TODO: swap for a nicer CO2 icon if you want
  corruption: <IconBriefcaseOff size={16} />, // TODO: swap for a nicer corruption icon if you want
  landlocked: <IconLock size={16} />,
  tax: <IconCoins size={16} />,
  wheat: <IconWheat size={16} />,
  airPassengers: <IconPlane size={16} />,
} as const;

// Keys for safer icon mapping, derived from the icon map
type ClueKey = keyof typeof clueIcons;

type Clue = {
  key: ClueKey;
  label: string;
  value: string;
};

export function StatClues({
  country,
  guessCount,
  gameEnded,
  statsByCode,
}: StatCluesProps) {
  const stats = statsByCode?.[country.code] ?? null;

  // Build clues in the order you want to reveal them.
  // Skip any that are null/undefined.
  const clues = buildClues(stats);

  // Show 1 stat initially, then +1 per guess. If game ended, reveal all.
  const revealCount = gameEnded ? clues.length : Math.min(1 + guessCount, clues.length);

  const isLoading = statsByCode == null; // fetching/cached not ready
  const hasNoClues = !isLoading && clues.length === 0;

  return (
    <Card w="100%" withBorder shadow="xs" p="md">
      <Flex direction="column" gap={8}>
        <Flex align="center" justify="space-between">
          <Text fw={600}>Clues</Text>
          <Badge variant="light">
            {Math.min(revealCount, clues.length)} / {clues.length}
          </Badge>
        </Flex>

        {isLoading && (
          <Alert variant="light" color="blue" mt={4}>
            Fetching latest stats…
          </Alert>
        )}

        {hasNoClues && (
          <Alert variant="light" color="yellow" mt={4}>
            No stats available (yet).
          </Alert>
        )}

        {!isLoading && clues.length > 0 && (
          <Flex direction="column" gap={6} mt={4}>
            {clues.slice(0, revealCount).map((s, i) => (
              <Box key={i}>
                <Group gap="xs" wrap="nowrap">
                  {clueIcons[s.key]}
                  <Text size="sm">
                    <Text span fw={600}>{s.label}{s.label !== 'landlocked' ? ':' : ''} </Text>
                    {s.value}
                  </Text>
                </Group>
              </Box>
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}

// ---- helpers ----
function buildClues(stats: CountryStats | null | undefined): Clue[] {
  if (!stats) return [];

  const out: Clue[] = [];

  // Order of reveal (tweak as you like)
  if (isNum(stats.population)) out.push({ key: 'population', label: 'Population', value: formatter(stats.population) });
  if (isNum(stats.gdpPerCapita)) out.push({ key: 'gdpPerCapita', label: 'GDP per capita', value: '$' + formatter(stats.gdpPerCapita) });
  if (isNum(stats.lifeExpectancy)) out.push({ key: 'lifeExpectancy', label: 'Life expectancy', value: stats.lifeExpectancy.toFixed(1) + ' years of age' });
  if (isNum(stats.unemployment)) out.push({ key: 'unemployment', label: 'Unemployment rate', value: stats.unemployment.toFixed(1) + '%' });
  if (isNum(stats.gdp)) out.push({ key: 'gdp', label: 'GDP', value: '$' + formatterCompact(stats.gdp) });


  if (isNum(stats.area)) out.push({ key: 'area', label: 'Area', value: formatter(stats.area) + ' km²' });
  // first 6 are clues, the rest are just info for the nerds
  if (isNum(stats.goats)) out.push({ key: 'goats', label: 'Goat population', value: formatter(stats.goats) });
  if (stats.carSide) out.push({ key: 'carSide', label: 'Drives on the', value: stats.carSide });
  if (isNum(stats.forestArea)) out.push({ key: 'forestArea', label: 'Forest area', value: formatter(stats.forestArea) + 'km²' });
  if (isNum(stats.precipitation)) out.push({ key: 'precipitation', label: 'Annual precipitation', value: formatter(stats.precipitation) + ' mm' });
  if (isNum(stats.co2)) out.push({ key: 'co2', label: 'CO2 per capita', value: formatter(stats.co2) + ' tonnes' });
  if (stats.landlocked === true) out.push({ key: 'landlocked', label: 'Landlocked', value: "" });
  if (isNum(stats.corruption)) out.push({ key: 'corruption', label: 'Control of corruption', value: 'better than ' + formatter(stats.corruption) + '% of countries' });
  if (isNum(stats.tax)) out.push({ key: 'tax', label: 'Tax revenue (% of GDP)', value: stats.tax.toFixed(1) });
  if (isNum(stats.wheat)) out.push({ key: 'wheat', label: 'Wheat Production (metric tons)', value: formatterCompact(stats.wheat) });
  if (isNum(stats.airPassengers)) out.push({ key: 'airPassengers', label: 'Air Passengers', value: formatterCompact(stats.airPassengers) });

  return out;
}

function formatterCompact(num: any, locale = "en") {
  if (num === null || num === undefined) return "";
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "long",
    maximumFractionDigits: 1
  }).format(num);
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function formatter(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}
