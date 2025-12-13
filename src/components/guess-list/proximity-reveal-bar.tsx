import { useEffect, useState } from 'react';
import { Flex } from '@mantine/core';

type Props = {
  proximity: number;          // 0–100
  blocks?: number;            // default 5
  durationMs?: number;        // total animation time
  onDone: () => void;
};

export function ProximityRevealBar({
  proximity,
  blocks = 5,
  durationMs = 800,
  onDone,
}: Props) {
  const targetBlocks = Math.round((proximity / 100) * blocks);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const stepMs = durationMs / blocks;

    const timers = Array.from({ length: blocks }).map((_, i) =>
      setTimeout(() => {
        setVisible((v) => Math.max(v, i + 1));
      }, i * stepMs)
    );

    const doneTimer = setTimeout(onDone, durationMs + 80);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, [blocks, durationMs, onDone]);

  return (
    <Flex
      w="100%"
      h={24}
      gap={6}
      align="center"
      justify="space-between"
      px={12}
    >
      {Array.from({ length: blocks }).map((_, i) => {
        const isShown = i < visible;
        const isGreen = i < targetBlocks;

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 3,
              backgroundColor: !isShown
                ? 'transparent'
                : isGreen
                  ? 'var(--mantine-color-green-6)'
                  : 'var(--mantine-color-gray-4)',
              transition: 'background-color 150ms ease',
            }}
          />
        );
      })}
    </Flex>
  );
}
