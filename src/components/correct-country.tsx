import { Badge, Button, Flex, Image } from '@mantine/core';
import { GameStatus } from '../constants';
import { Country } from '../data/countries/countries';
import ConfettiExplosion from 'react-confetti-explosion';

type CorrectCountryProps = {
  country: Country;
  gameStatus: GameStatus;
  onPlayAgain: () => void;  
};

export function CorrectCountry({ country, gameStatus, onPlayAgain }: CorrectCountryProps) {
  const code = country.code.toLowerCase();
  const flagUrl = code == 'el' ? `https://flagcdn.com/w160/gr.png` : `https://flagcdn.com/w160/${code}.png`; // 160px wide, expection for greece (uses GR code)

  return (
    <Flex direction="column" gap={16} align="center">
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

      <Flex w="100%" justify="center" align="center" gap={8} direction="row">
        <Button size="md" onClick={onPlayAgain}>
          Play again
        </Button>
      </Flex>
    </Flex>
  );
}
