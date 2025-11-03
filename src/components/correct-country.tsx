import { Badge, Button, Flex, Image } from '@mantine/core';
import { GameStatus } from '../constants';
import { Country } from '../data/countries/countries';
import ConfettiExplosion from 'react-confetti-explosion';
import { getFlagURL } from '../helpers/getFlagURL';
import { ShareResult } from './share-result';

type CorrectCountryProps = {
  country: Country;
  gameStatus: GameStatus;
  onPlayAgain?: () => void;     // ← made optional for daily mode
  dailyMode?: boolean;
};

export function CorrectCountry({
  country,
  gameStatus,
  onPlayAgain,
  dailyMode = true,
}: CorrectCountryProps) {
  const flagUrl = getFlagURL(country.code);

  return (
    <Flex direction="column" gap={8} align="center">
      {gameStatus === GameStatus.Won && (
        <>
          <ConfettiExplosion />
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
      <Flex direction="column" align="center" gap={6} mt="sm">
        {/* Daily mode: block replay; else show Play again if handler provided */}
        {dailyMode ? (
          <Button size="md" disabled>
            Come back tomorrow
          </Button>
        ) : onPlayAgain ? (
          <Button size="md" onClick={onPlayAgain}>
            Play again
          </Button>
        ) : null}

        <ShareResult />
      </Flex>
    </Flex>
  );
}

export default CorrectCountry;