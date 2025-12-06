import { ActionIcon, Anchor, Divider, Flex, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconQuestionMark } from '@tabler/icons-react';
import { ExampleCountryCard } from './example-country-card';
import { convertDistance, getDistance } from 'geolib';
import { countries } from '../data/countries/countries';
import { getCompassDirection, directionMap } from '../services/geo';

export function Rules() {
  const [opened, { open, close }] = useDisclosure(false);


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

  const proximity1 = Math.floor(100 - (Number(distance1) / 20000) * 100)
  const proximity2 = Math.floor(100 - (Number(distance2) / 20000) * 100)

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title="How to play"
        size={'lg'}
        styles={{
          title: {
            fontWeight: 500,
          },
        }}
      >
        <Flex direction={'column'} gap={16}>
          <Text size="sm">
            Guess the <span>country</span> in 6 guesses.
          </Text>
          <Text size="sm">
            Each guess must be a valid country or territory.
          </Text>
          <Text size="sm">
            Before your first guess you’ll see one statistic about the country.
          </Text>
          <Text size="sm">
            After each guess, you’ll see one additional statistic, plus feedback
            on distance, direction and proximity to the target.
          </Text>
          <Text fw={500} size="sm">
            Examples:
          </Text>
          <Flex direction={'column'} gap={24}>
            <ExampleCountryCard
              guessCountry={country1}
              country={targetCountry}
            />
            <Text size="sm">
              Your guess {country1.name} is {distance1}
              km away from the target location, the target location is in the
              {
                directionMap[
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
                ]
              }{' '}
              direction and you have {proximity1}% of proximity!
            </Text>
          </Flex>

          <ExampleCountryCard
            guessCountry={country2}
            country={targetCountry}
          />
          <Text size="sm">
            Your second guess <Text span fw={500} />
            {country2.name} is getting closer! {distance2}
            km away,{' '}
            {
              directionMap[
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
              ]
            }{' '}
            and {proximity2}%!
          </Text>

          <ExampleCountryCard
            guessCountry={targetCountry}
            country={targetCountry}
          />
          <Text size="sm">
            Next guess,{' '}
            <Text span fw={500}>
              {targetCountry.name}
            </Text>
            , it's the location to guess! Congrats! 🎉
          </Text>
          <Divider />
          <Text size="sm">
            Inspired by{' '}
            <Anchor href="https://www.nytimes.com/games/wordle/index.html">
              Wordle{' '}
            </Anchor>
            and{' '}
            <Anchor href="https://worldle.teuteuf.fr/">
              {' '}
              Worldle by Teuteuf
            </Anchor>
          </Text>
          <Text size="sm">
            Data sources: World Bank, REST countries, Eurostat. Notebook containing data sources and processing steps <Anchor href="https://observablehq.com/d/a1383688270e4c00">
              can be found here.
            </Anchor>
          </Text>
          <Text size="sm">
            This site uses GoatCounter, a privacy-friendly analytics tool.
            It does not use cookies or collect personal data.
            It only collects anonymised usage statistics to understand overall traffic patterns.
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

        </Flex>
      </Modal>
      <ActionIcon onClick={open} size={'lg'} variant="default">
        <IconQuestionMark stroke={1.5} />
      </ActionIcon>
    </>
  );
}
