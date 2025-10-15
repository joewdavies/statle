// src/components/stat-clues.tsx
import { Alert, Badge, Box, Card, Flex, Text } from '@mantine/core';
import { Country } from '../data/countries/countries';
import type { CountryStats } from '../data/stats/stats';

type StatCluesProps = {
  country: Country;
  guessCount: number;
  gameEnded?: boolean; // reveal all stats at game end
  statsByCode?: Record<string, CountryStats> | null; // <-- NEW
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
                <Text size="sm">
                  <Text span fw={600}>{s.label}: </Text>
                  {s.value}
                </Text>
              </Box>
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}

// ---- helpers ----
function buildClues(stats: CountryStats | null | undefined): { label: string; value: string }[] {
  if (!stats) return [];

  const out: { label: string; value: string }[] = [];

  // Order of reveal (tweak as you like)
  if (isNum(stats.population)) out.push({ label: 'Population', value: fmtInt(stats.population) });
  if (isNum(stats.GDPPerCapita)) out.push({ label: 'GDP per capita (EUR)', value: fmtInt(stats.GDPPerCapita) });
  if (isNum(stats.lifeExpectancy)) out.push({ label: 'Life expectancy (years)', value: stats.lifeExpectancy.toFixed(1) });
  if (isNum(stats.unemployment)) out.push({ label: 'Unemployment (%)', value: stats.unemployment.toFixed(1) });
<<<<<<< HEAD
  if (isNum(stats.GDP)) out.push({ label: 'GDP (EUR)', value: formatter.format(stats.GDP) });
=======
  if (isNum(stats.GDP)) out.push({ label: 'GDP (EUR)', value: formatter(stats.GDP) });
>>>>>>> 28349021f03db63343f21be7b77ef6709127390b
  if (isNum(stats.area)) out.push({ label: 'Area (km²)', value: fmtInt(stats.area) });
  if (isNum(stats.goats)) out.push({ label: 'Goat population', value: fmtInt(stats.goats) });
  if (stats.carSide) out.push({ label: 'Drives on the', value: stats.carSide });
  if (isNum(stats.forestArea)) out.push({ label: 'Forest area (km²)', value: fmtInt(stats.forestArea) });
  if (isNum(stats.precipitation)) out.push({ label: 'Annual precipitation (mm)', value: fmtInt(stats.precipitation) });
  //if (stats.currencies) out.push({ label: 'Currency', value: Object.values(stats.currencies).map(c => c.name).join(', ') });


  return out;
}

<<<<<<< HEAD
const formatter = new Intl.NumberFormat(undefined, {
  notation: "compact", // "compact" gives "1M" / "1 million"
  compactDisplay: "long" // "short" = "1M", "long" = "1 million"
})
=======
function formatter(num:any, locale = "en") {
  if (num === null || num === undefined) return "";

  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "long",
    maximumFractionDigits: 1
  }).format(num);
}
>>>>>>> 28349021f03db63343f21be7b77ef6709127390b

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function fmtInt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}
