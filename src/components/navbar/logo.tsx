import { Flex, Title, Image } from '@mantine/core';

export function Logo() {
  const christmas =
    (new Date().getMonth() === 11 && new Date().getDate() >= 1) || // December (month 11)
    (new Date().getMonth() === 0 && new Date().getDate() <= 7);   // January (month 0)

  return (
    <Flex align={'center'} gap={4} justify={'center'}>
      {/* Both icons stay in the DOM so the browser preloads them; CSS swaps them with no flicker. */}
      <Image
        src="./img/statle-icon.png"
        alt="Statle logo"
        width={28}
        height={28}
        darkHidden
        style={{ pointerEvents: 'none' }}
      />
      <Image
        src="./img/statle-icon-darkmode.png"
        alt="Statle logo"
        width={28}
        height={28}
        lightHidden
        style={{ pointerEvents: 'none', opacity: 0.8 }}
      />
      <Title fw={700} order={2} c="var(--mantine-white)">
        STATLE
      </Title>
      {christmas && <Image
        src="./img/santa-hat.png"
        alt="Santa hat"
        width={25}
        height={25}
        style={{
          transform: 'translate(-20px, -5px)',
          pointerEvents: 'none',
        }}
      />}
    </Flex>
  );
}
