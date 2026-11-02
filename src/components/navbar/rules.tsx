import { ActionIcon, Flex, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconQuestionMark } from '@tabler/icons-react';
import { convertDistance, getDistance } from 'geolib';
import { countries, getCountryName } from '../../data/countries/countries';
import { getCompassDirection, directionMap } from '../../services/geo';
import { GuessRow } from '../guess-list/guess-row';
import { useLanguage } from '../../hooks/useLanguage';

export function Rules() {
  const [opened, { open, close }] = useDisclosure(false);
  const { t, language } = useLanguage();

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
        title={t("How to play")}
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
              {t("Your guess")} {getCountryName(country1, language)} is {distance1}
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
            {t("Your second guess")} <Text span fw={500} />
            {getCountryName(country2, language)} {t("is getting closer!")} {distance2}
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
              {getCountryName(targetCountry, language)}
            </Text>
            {t(", it's the location to guess! Congrats! 🎉")}
          </Text>
        </Flex>
      </Modal>
      <ActionIcon onClick={open} size={'lg'} variant="default">
        <IconQuestionMark stroke={1.5} />
      </ActionIcon>
    </>
  );
}
