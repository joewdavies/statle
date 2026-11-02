import { Badge, Button, Flex, Image, Tooltip } from '@mantine/core';
import { GameStatus } from '../constants';
import { Country, getCountryName } from '../data/countries/countries';

import { getFlagURL } from '../helpers/getFlag';
import { ShareResult } from './share-result';
import { IconBrandWikipedia } from '@tabler/icons-react';
import { useLanguage } from '../hooks/useLanguage';

type CorrectCountryProps = {
  country: Country;
  gameStatus: GameStatus;
  onPlayAgain?: () => void; // ← made optional for daily mode
  dailyMode?: boolean;
};

export function CorrectCountry({ country, gameStatus }: CorrectCountryProps) {
  const { language, t } = useLanguage();
  const countryName = getCountryName(country, language);
  const flagUrl = getFlagURL(country.code);

  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
    country.name
  )}`;

  return (
    <Flex direction="column" gap={8} align="center">
      {gameStatus === GameStatus.Won && (
        <>
          <Image
            src={flagUrl}
            alt={`${countryName} flag`}
            radius="sm"
            style={{
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              width: '120px',
            }}
          />
        </>
      )}

      <Badge
        color={gameStatus === GameStatus.Won ? 'green' : 'red'}
        variant="filled"
      >
        {t("Country:")} {countryName}
      </Badge>

      <Tooltip label={t("Read more on Wikipedia")} withArrow>
        <Button
          component="a"
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="light"
        >
          {t("Wikipedia page")}{' '}
          <IconBrandWikipedia size={17} style={{ marginLeft: 4 }} />
        </Button>
      </Tooltip>

      {/* Buttons stacked vertically; tighter spacing */}
      <Flex direction="column" align="center" gap={6}>
        <ShareResult />
        {/* <Text>See you tomorrow!</Text> */}
      </Flex>
    </Flex>
  );
}

export default CorrectCountry;
