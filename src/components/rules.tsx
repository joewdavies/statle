import { ActionIcon, Anchor, Divider, Flex, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconQuestionMark } from '@tabler/icons-react';
import { ExampleCountryCard } from './example-country-card';
import { convertDistance, getDistance } from 'geolib';
import { directionMap } from '../helpers/directionMap';
import { countries } from '../data/countries/countries';
import { getCompassDirection } from '../services/geo';

export function Rules() {
  const [opened, { open, close }] = useDisclosure(false);

  const distance1 = convertDistance(
    getDistance(
      {
        latitude: countries[2].latitude,
        longitude: countries[2].longitude,
      },
      {
        latitude: countries[0].latitude,
        longitude: countries[0].longitude,
      }
    ),
    'km'
  ).toFixed(0);

  const distance2 = convertDistance(
    getDistance(
      {
        latitude: countries[5].latitude,
        longitude: countries[5].longitude,
      },
      {
        latitude: countries[0].latitude,
        longitude: countries[0].longitude,
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
          <Divider />
          <Text fw={500} size="sm">
            Examples:
          </Text>
          <Flex direction={'column'} gap={24}>
            <ExampleCountryCard
              guessCountry={countries[2]}
              country={countries[0]}
            />
            <Text size="sm">
              Your guess {countries[2].name} is {distance1}
              km away from the target location, the target location is in the
              {
                directionMap[
                  getCompassDirection(
                    {
                      latitude: countries[2].latitude,
                      longitude: countries[2].longitude,
                    },
                    {
                      latitude: countries[0].latitude,
                      longitude: countries[0].longitude,
                    }
                  )
                ]
              }{' '}
              direction and you have {proximity1}% of proximity!
            </Text>
          </Flex>

          <ExampleCountryCard
            guessCountry={countries[5]}
            country={countries[0]}
          />
          <Text size="sm">
            Your second guess <Text span fw={500} />
            {countries[5].name} is getting closer! {distance2}
            km away,{' '}
            {
              directionMap[
                getCompassDirection(
                  {
                    latitude: countries[5].latitude,
                    longitude: countries[5].longitude,
                  },
                  {
                    latitude: countries[0].latitude,
                    longitude: countries[0].longitude,
                  }
                )
              ]
            }{' '}
            and {proximity2}%!
          </Text>

          <ExampleCountryCard
            guessCountry={countries[0]}
            country={countries[0]}
          />
          <Text size="sm">
            Next guess,{' '}
            <Text span fw={500}>
              {countries[0].name}
            </Text>
            , it's the location to guess! Congrats! 🎉
          </Text>
          <Text>
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
          <Text>
            Data sources: Eurostat, World Bank, REST countries.
          </Text>
        </Flex>
      </Modal>
      <ActionIcon onClick={open} size={'lg'} variant="default">
        <IconQuestionMark stroke={1.5} />
      </ActionIcon>
    </>
  );
}
