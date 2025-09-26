import { Badge, Button, Flex, Image } from '@mantine/core';
import { GameStatus } from '../constants';
import { Country } from '../data/countries';
import { resetGame } from '../helpers/resetGame';

type CorrectCountryProps = {
  country: Country;
  gameStatus: GameStatus;
};

export function CorrectCountry({ country, gameStatus }: CorrectCountryProps) {
  const code = country.code.toLowerCase();
  const flagUrl = `https://flagcdn.com/w160/${code}.png`; // 160px wide

  return (
    <Flex direction="column" gap={16} align="center">
      {gameStatus === GameStatus.Won && (
        <Image
          src={flagUrl}
          alt={`${country.name} flag`}
          width={120}
          radius="sm"
          style={{ boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}
        />
      )}

      <Badge
        color={gameStatus === GameStatus.Won ? 'green' : 'red'}
        variant="filled"
      >
        Country: {country.name}
      </Badge>

      <Flex w="100%" justify="center" align="center" gap={8} direction="row">
        <Button size="md" onClick={resetGame}>
          Play again
        </Button>
      </Flex>
    </Flex>
  );
}
