import { Flex, Title } from '@mantine/core';
import { IconChartScatter } from '@tabler/icons-react';

export function Logo() {
  return (
    <Flex align={'center'} gap={4} justify={'center'}>
      <IconChartScatter />
      <Title fw={700} order={2} c="var(--mantine-white)">
        STATLE
      </Title>
    </Flex>
  );
}
