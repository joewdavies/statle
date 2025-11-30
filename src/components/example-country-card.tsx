// src/components/example-country-card.tsx
import { Box, Divider, Flex, Paper, Text } from "@mantine/core";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Country } from "../data/countries/countries";
import { convertDistance, getDistance } from "geolib";
import { getCompassDirection, directionMap } from "../services/geo";

type TextWithAnimationProps = { children: React.ReactNode };

const TextWithAnimation = ({ children }: TextWithAnimationProps) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
    {children}
  </motion.div>
);

type AnimatedTextProps = { text: string };

const AnimatedText = ({ text }: AnimatedTextProps) => (
  <TextWithAnimation>
    <Text size="xs" lineClamp={1}>{text}</Text>
  </TextWithAnimation>
);

type CountryCardProps = {
  guessCountry: Country;
  country: Country;
};

export function ExampleCountryCard({ guessCountry, country }: CountryCardProps) {
  const guessLL = { latitude: guessCountry.latitude, longitude: guessCountry.longitude };
  const targetLL = { latitude: country.latitude, longitude: country.longitude };

  const distance = convertDistance(getDistance(guessLL, targetLL), "km");
  const direction = getCompassDirection(guessLL, targetLL);
  // Match real card formula (closer = higher %)
  const proximity = 100 - (distance / 20000) * 100;

  return (
    <Paper
      w="100%"
      shadow="xs"
      withBorder
      h={36}
      px={24}
      style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Flex justify="space-between" align="center" w="100%">
        {guessCountry && (
          <>
            <Box w="35%">
              <AnimatedText text={guessCountry.name} />
            </Box>

            <Divider orientation="vertical" />

            <Text w="20%" size="xs">
              <CountUp start={0} end={Math.round(distance)} duration={1} /> km
            </Text>

            <Divider orientation="vertical" />

            {/* Use the same arrow/emoji logic as CountryCard */}
            <Box w="15%">
              <AnimatedText
                text={guessCountry === country ? "🎉" : directionMap[direction] || "🧭"}
              />
            </Box>

            <Divider orientation="vertical" />

            <Text w="15%" size="xs">
              <CountUp start={0} end={Math.floor(proximity)} duration={1} /> %
            </Text>
          </>
        )}
      </Flex>
    </Paper>
  );
}
