import { Badge, Button, Flex, Image } from '@mantine/core';
import { GameStatus } from '../constants';
import { Country } from '../data/countries/countries';
import ConfettiExplosion from 'react-confetti-explosion';
import { getFlagURL } from '../helpers/getFlagURL';
import { ShareResult } from './share-result';

type CorrectCountryProps = {
  country: Country;
  gameStatus: GameStatus;
  onPlayAgain: () => void;
};

export function CorrectCountry({ country, gameStatus, onPlayAgain }: CorrectCountryProps) {
  const flagUrl = getFlagURL(country.code);

  return (
    <Flex direction="column" gap={8} align="center"> {/* reduced from 16 → 8 */}
      {gameStatus === GameStatus.Won && (
        <>
          <ConfettiExplosion />
          <Image
            src={flagUrl}
            alt={`${country.name} flag`}
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
        Country: {country.name}
      </Badge>

      {/* Stack the buttons vertically */}
      <Flex direction="column" align="center" gap={6} mt="sm">
        <Button size="md" onClick={onPlayAgain}>
          Play again
        </Button>
        <ShareResult />
      </Flex>
    </Flex>
  );
}
