import { Flex, Title, Image } from '@mantine/core';
import { IconChartScatter } from '@tabler/icons-react';

export function Logo() {
  return (
    <Flex align={'center'} gap={4} justify={'center'}>
      <IconChartScatter />
      <Title fw={700} order={2} c="var(--mantine-white)">
        STATLE
      </Title>
      <Image
        src="./img/santa-hat.png"
        alt="Santa hat"
        width={25}
        height={25}
        style={{
          transform: 'translate(-20px, -5px)',
          pointerEvents: 'none',
        }}
      />
    </Flex>
  );
}
