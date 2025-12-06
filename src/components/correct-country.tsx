import { Badge, Flex, Image, useMantineColorScheme } from '@mantine/core';
import { GameStatus } from '../constants';
import { Country } from '../data/countries/countries';
import ConfettiExplosion from 'react-confetti-explosion';
import Snowfall from 'react-snowfall';
import { getFlagURL } from '../helpers/getFlagURL';
import { ShareResult } from './share-result';

type CorrectCountryProps = {
  country: Country;
  gameStatus: GameStatus;
  onPlayAgain?: () => void;     // ← made optional for daily mode
  dailyMode?: boolean;
};

const christmas =
  (new Date().getMonth() === 11 && new Date().getDate() >= 1) || // December (month 11)
  (new Date().getMonth() === 0 && new Date().getDate() <= 7);   // January (month 0)

export function CorrectCountry({
  country,
  gameStatus,
}: CorrectCountryProps) {
  const flagUrl = getFlagURL(country.code);
  const { colorScheme } = useMantineColorScheme();

  return (
    <Flex direction="column" gap={8} align="center">
      {(gameStatus === GameStatus.Won || gameStatus === GameStatus.Lost) && christmas && colorScheme == 'dark' && < Snowfall
        snowflakeCount={80}        // number of flakes
        color={colorScheme === "dark" ? "#ffffffff" : "#3c4349ff"} // or "#cce6ff" for a softer look
        radius={[0.5, 2.0]}        // size variation
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />}
      {gameStatus === GameStatus.Won && (
        <>
          {<ConfettiExplosion />}
          <Image
            src={flagUrl}
            alt={`${country.name} flag`}
            radius="sm"
            style={{ boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)', width: '120px' }}
          />
        </>
      )}

      <Badge
        color={gameStatus === GameStatus.Won ? 'green' : 'red'}
        variant="filled"
      >
        Country: {country.name}
      </Badge>

      {/* Buttons stacked vertically; tighter spacing */}
      <Flex direction="column" align="center" gap={6} >
        <ShareResult />
        {/* <Text>See you tomorrow!</Text> */}
      </Flex>
    </Flex>
  );
}

export default CorrectCountry;
