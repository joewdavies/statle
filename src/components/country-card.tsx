import { Box, Divider, Flex, Text, Card } from '@mantine/core';
import { convertDistance, getCompassDirection, getDistance } from 'geolib';
import { Country } from '../data/countries';
import CountUp from 'react-countup';
import { directionMap } from '../helpers/directionMap';


export function CountryCardHeader() {
  const cell = {
    padding: 8,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  };

  return (
    <Card
      key='header'
      w={"100%"}
      h={24}
      px={24}
      style={{
        borderColor: 'none',
        textAlign: "center",
        display: "flex",
        alignItems: "start",
        justifyContent: "center",
      }}
    >
      <Flex
        align="left"
        wrap="nowrap"
        w="100%"
      >
        <div style={{ ...cell, flex: '0 0 25%' }}>
          <Text fw={700} size="xs">Guess</Text>
        </div>
        <div style={{ ...cell, flex: '0 0 25%', borderLeft: '1px solid var(--mantine-color-gray-3)' }}>
          <Text fw={700} size="xs">Distance</Text>
        </div>
        <div style={{ ...cell, flex: '0 0 25%', borderLeft: '1px solid var(--mantine-color-gray-3)' }}>
          <Text fw={700} size="xs">Direction</Text>
        </div>
        <div style={{ ...cell, flex: '0 0 25%', borderLeft: '1px solid var(--mantine-color-gray-3)' }}>
          <Text fw={700} size="xs">Proximity</Text>
        </div>
      </Flex>
    </Card>
  );
}

const clampStyle = { fontSize: 'clamp(12px, 3.5vw, 16px)' };
const truncateStyle = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const CellText = ({ children }: { children: React.ReactNode }) => (
  <Text ta="center" size="sm" style={{ ...clampStyle, ...truncateStyle }}>
    {children}
  </Text>
);

/* ---------- Data row ---------- */
type CountryCardProps = {
  guessCountry: Country;
  country: Country;
};

export function CountryCard({ guessCountry, country }: CountryCardProps) {
  const guessCountryLatAndLong = {
    latitude: guessCountry.latitude,
    longitude: guessCountry.longitude,
  };

  const countryLatAndLong = {
    latitude: country.latitude,
    longitude: country.longitude,
  };

  const distance = convertDistance(
    getDistance(guessCountryLatAndLong, countryLatAndLong),
    'km'
  );

  const direction = getCompassDirection(
    guessCountryLatAndLong,
    countryLatAndLong
  );

  const proximity = 100 - (distance / 20000) * 100;

  // safer equality: compare codes (object identity can differ)
  const isCorrect =
    guessCountry.code?.toLowerCase() === country.code?.toLowerCase();

  return (

    <Flex
      justify="space-between"
      align="center"
      w="100%"
      gap={8}
      style={{
        border: '1px solid transparent',
        background: 'transparent',
        borderRadius: 8,
        padding: 8,
      }}
    >
      {guessCountry && (
        <>
          {/* Guess name */}
          <Box w="25%">
            <CellText>{guessCountry.name}</CellText>
          </Box>

          <Divider orientation="vertical" />

          {/* Distance */}
          <Box w="25%">
            <CellText>
              <CountUp start={0} end={distance} duration={1} separator=" " /> km
            </CellText>
          </Box>

          <Divider orientation="vertical" />

          {/* Direction */}
          <Box w="25%">
            <CellText>
              {isCorrect ? '🎉' : directionMap[direction] || '🧭'}
            </CellText>
          </Box>

          <Divider orientation="vertical" />

          {/* Proximity */}
          <Box w="25%">
            <CellText>
              <CountUp start={0} end={Math.floor(proximity)} duration={1} />%
            </CellText>
          </Box>
        </>
      )}
    </Flex>
  );
}
