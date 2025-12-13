import { useEffect, useState } from 'react';
import { Flex } from '@mantine/core';

type Props = {
  proximity: number;          // 0–100
  blocks?: number;
  durationMs?: number;
  distanceKm?: number;
  onDone: () => void;
};

export function ProximityRevealBar({
  proximity,
  distanceKm,
  blocks = 10,
  durationMs = 1000,
  onDone,
}: Props) {
  const targetBlocks = Math.round((proximity / 100) * blocks);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      setProgress(t);

      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const doneTimer = setTimeout(onDone, durationMs + 80);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(doneTimer);
    };
  }, [durationMs, onDone]);

  const visible = Math.round(progress * blocks);
  console.log(distanceKm)

  return (
    <Flex w="100%" direction="column" gap={6} px={12}>
      {/* Numeric countdown */}
      {/* <Text ta="center" fw={700} size="sm">
        {distanceKm != null
          ? `${Math.round(distanceKm * (1 - progress))} km`
          : `${Math.round(progress * 100)}%`}
      </Text> */}

      {/* Blocks */}
      <Flex h={20} gap={6} align="center">
        {Array.from({ length: blocks }).map((_, i) => {
          const isShown = i < visible;
          const isGreen = i < targetBlocks;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 25,
                borderRadius: 3,
                backgroundColor: !isShown
                  ? 'transparent'
                  : isGreen
                    ? 'var(--mantine-color-green-6)'
                    : 'var(--mantine-color-gray-4)',
              }}
            />
          );
        })}
      </Flex>
    </Flex>
  );
}
