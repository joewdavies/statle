// src/components/stat-clues.tsx
import { Alert, Badge, Box, Card, Flex, Group, Text } from '@mantine/core';
import { Country } from '../data/countries/countries';
import type { CountryStats } from '../data/stats/stats';

// ⬇️ Tabler icons (add/remove as you like)
import {
  IconUsers,
  IconCurrencyEuro,
  IconHeartbeat,
  IconBriefcaseOff,
  IconCoins,
  IconRulerMeasure,
  IconSteeringWheel,
  IconTrees,
  IconCloudRain,
} from '@tabler/icons-react';

import { GiGoat } from "react-icons/gi";

type StatCluesProps = {
  country: Country;
  guessCount: number;
  gameEnded?: boolean; // reveal all stats at game end
  statsByCode?: Record<string, CountryStats> | null; // <-- NEW
};

// Keys for safer icon mapping
type ClueKey =
  | 'population'
  | 'gdpPerCapita'
  | 'lifeExpectancy'
  | 'unemployment'
  | 'gdp'
  | 'area'
  | 'goats'
  | 'carSide'
  | 'forestArea'
  | 'precipitation';

type Clue = {
  key: ClueKey;
  label: string;
  value: string;
};

// Icon map (size 16 keeps it tidy with Text size="sm")
const clueIcons: Record<ClueKey, JSX.Element> = {
  population: <IconUsers size={16} />,
  gdpPerCapita: <IconCurrencyEuro size={16} />,
  lifeExpectancy: <IconHeartbeat size={16} />,
  unemployment: <IconBriefcaseOff size={16} />,
  gdp: <IconCoins size={16} />,
  area: <IconRulerMeasure size={16} />,
  goats: <GiGoat size={16} />,
  carSide: <IconSteeringWheel size={16} />,
  forestArea: <IconTrees size={16} />,
  precipitation: <IconCloudRain size={16} />,
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
                    <Text span fw={600}>{s.label}: </Text>
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
  if (isNum(stats.population)) out.push({ key: 'population', label: 'Population', value: fmtInt(stats.population) });
  if (isNum(stats.GDPPerCapita)) out.push({ key: 'gdpPerCapita', label: 'GDP per capita (EUR)', value: fmtInt(stats.GDPPerCapita) });
  if (isNum(stats.lifeExpectancy)) out.push({ key: 'lifeExpectancy', label: 'Life expectancy (years)', value: stats.lifeExpectancy.toFixed(1) });
  if (isNum(stats.unemployment)) out.push({ key: 'unemployment', label: 'Unemployment (%)', value: stats.unemployment.toFixed(1) });
  if (isNum(stats.GDP)) out.push({ key: 'gdp', label: 'GDP (EUR)', value: formatter(stats.GDP) });
  if (isNum(stats.area)) out.push({ key: 'area', label: 'Area (km²)', value: fmtInt(stats.area) });
  if (isNum(stats.goats)) out.push({ key: 'goats', label: 'Goat population', value: fmtInt(stats.goats) });
  if (stats.carSide) out.push({ key: 'carSide', label: 'Drives on the', value: stats.carSide });
  if (isNum(stats.forestArea)) out.push({ key: 'forestArea', label: 'Forest area (km²)', value: fmtInt(stats.forestArea) });
  if (isNum(stats.precipitation)) out.push({ key: 'precipitation', label: 'Annual precipitation (mm)', value: fmtInt(stats.precipitation) });

  return out;
}

function formatter(num: any, locale = "en") {
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

function fmtInt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}
