import { Button, Tooltip } from '@mantine/core';
import { IconShare3 } from '@tabler/icons-react';
import { MAX_GUESSES } from '../constants';
import { useUserStats } from '../hooks/useUserStats';

function pad2(n: number) { return String(n).padStart(2, '0'); }
function formatDateDot(d = new Date()) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function ShareResult() {
  const { userStats } = useUserStats(MAX_GUESSES);
  const last = userStats.lastGame;

  const date = formatDateDot(new Date());
  const triesStr = last
    ? `${Math.max(1, last.guessCount)}/${MAX_GUESSES}`
    : `${MAX_GUESSES}/${MAX_GUESSES}`; // fallback

  const winRatePct = Math.round((userStats.winRate ?? 0) * 100);
  const streak = userStats.currentStreak ?? 0;

  const squares =
    last?.result === 'won'
      ? '🟩'.repeat(Math.max(1, last.guessCount)) + '🎉'
      : '🟥'.repeat(MAX_GUESSES);

  const text = `Statle (${date}) ${triesStr} (${winRatePct}%)
🔥 Current Win Streak: ${streak}
${squares}
https://joewdavies.github.io/statle`;

  const share = async () => {
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      // very old fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  return (
    <Tooltip label="Copy result" withArrow>
      <Button onClick={share} leftSection={<IconShare3 size={18} />}>
        Share
      </Button>
    </Tooltip>
  );
}
