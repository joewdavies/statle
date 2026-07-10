import { ActionIcon, Anchor, Flex, Modal, Text, Tooltip, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconInfoCircle, IconBrandGithub } from '@tabler/icons-react';
import { useLanguage } from '../../hooks/useLanguage';
import { convertDistance, getDistance } from 'geolib';
import { countries } from '../../data/countries/countries';
import { getCompassDirection, directionMap } from '../../services/geo';
import { GuessRow } from '../guess-list/guess-row';

export function About() {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useLanguage();

  const country1 = countries[140];
  const country2 = countries[142];
  const targetCountry = countries[25];
  const distance1 = convertDistance(
    getDistance(
      {
        latitude: country1.latitude,
        longitude: country1.longitude,
      },
      {
        latitude: targetCountry.latitude,
        longitude: targetCountry.longitude,
      }
    ),
    'km'
  ).toFixed(0);

  const distance2 = convertDistance(
    getDistance(
      {
        latitude: country2.latitude,
        longitude: country2.longitude,
      },
      {
        latitude: targetCountry.latitude,
        longitude: targetCountry.longitude,
      }
    ),
    'km'
  ).toFixed(0);

  const proximity1 = Math.floor(100 - (Number(distance1) / 20000) * 100);
  const proximity2 = Math.floor(100 - (Number(distance2) / 20000) * 100);

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={t('About')}
        size={'lg'}
        styles={{
          title: {
            fontWeight: 500,
          },
        }}
      >
        <Flex direction={'column'} gap={16}>
          <Text size="sm">
            {t("Guess the country in 6 guesses.")}
          </Text>
          <Text size="sm">
            {t("Each guess must be a valid country or territory.")}
          </Text>
          <Text size="sm">
            {t("Before your first guess you’ll see one statistic about the country.")}
          </Text>
          <Text size="sm">
            {t("After each guess, you’ll see one additional statistic, plus feedback on distance, direction and proximity to the target.")}
          </Text>
          <Text fw={500} size="sm">
            {t("Examples:")}
          </Text>
          <Flex direction={'column'} gap={24}>
            <GuessRow
              guessCountry={country1}
              country={targetCountry}
            />
            <Text size="sm">
              Your guess {country1.name} is {distance1}
              {t("km away from the target location, the target location is in the")} {
                t(directionMap[
                getCompassDirection(
                  {
                    latitude: country1.latitude,
                    longitude: country1.longitude,
                  },
                  {
                    latitude: targetCountry.latitude,
                    longitude: targetCountry.longitude,
                  }
                )
                ])
              }{' '}
              {t("direction and you have")} {proximity1}{t("% of proximity!")}
            </Text>
          </Flex>

          <GuessRow
            guessCountry={country2}
            country={targetCountry}
          />
          <Text size="sm">
            Your second guess <Text span fw={500} />
            {country2.name} {t("is getting closer!")} {distance2}
            {t("km away,")} {
              t(directionMap[
              getCompassDirection(
                {
                  latitude: country2.latitude,
                  longitude: country2.longitude,
                },
                {
                  latitude: targetCountry.latitude,
                  longitude: targetCountry.longitude,
                }
              )
              ])
            }{' '}
            {t("and")} {proximity2}%!
          </Text>

          <GuessRow
            guessCountry={targetCountry}
            country={targetCountry}
          />
          <Text size="sm">
            {t("Next guess,")} <Text span fw={500}>
              {targetCountry.name}
            </Text>
            {t(", it's the location to guess! Congrats! 🎉")}
          </Text>
          
          <Divider my="sm" />

          <Text size="sm">
            {t('Inspired by ')}
            <Anchor href="https://www.nytimes.com/games/wordle/index.html">
              Wordle
            </Anchor>{' '}
            {t('and')}{' '}
            <Anchor href="https://worldle.teuteuf.fr/">
              Worldle by Teuteuf
            </Anchor>
          </Text>
          <Text size="sm">
            {t('Data sources: World Bank, REST countries, Eurostat. Notebook containing data sources and processing steps ')}
            <Anchor href="https://observablehq.com/d/a1383688270e4c00">
              {t('can be found here.')}
            </Anchor>
          </Text>
          <Text size="sm">
            {t('This site uses GoatCounter, a privacy-friendly analytics tool. It does not use cookies or collect personal data. It only collects anonymised usage statistics to understand overall traffic patterns.')}
          </Text>
          <Text ta="center">
            <a
              href="https://www.buymeacoffee.com/joewdavies"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buy Me A Coffee — Joe W Davies"
            >
              <img
                src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
                alt="Buy Me A Coffee"
                style={{ border: 0, display: 'inline-block', height: '37px' }}
              />
            </a>
          </Text>
          <Flex justify="center" mt="md">
            <Tooltip label="GitHub">
              <ActionIcon
                size={"xl"}
                variant="default"
                onClick={() =>
                  window.open("https://github.com/joewdavies/statle", "_blank")
                }
              >
                <IconBrandGithub stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Flex>
        </Flex>
      </Modal>
      <Tooltip label={t('About')}>
        <ActionIcon onClick={open} size={'lg'} variant="default">
          <IconInfoCircle stroke={1.5} />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
